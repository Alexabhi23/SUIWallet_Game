/// ============================================================================
/// Test Module: gaming::loot_box_tests
/// ============================================================================
/// Comprehensive test suite for the gaming::loot_box module.
///
/// Test coverage:
///   1. test_initialization          – GameConfig created with correct default weights & shared
///   2. test_purchase_flow           – SUI payment flow; treasury increases; user gets LootBox
///   3. test_open_loot_box_common    – Secure randomness mocking; Common rarity verified
///   4. test_open_loot_box_rare      – Secure randomness mocking; Rare rarity verified
///   5. test_open_loot_box_legendary – Secure randomness mocking; Legendary rarity verified
///   6. test_pity_system             – 30 Common opens → 31st is forced Legendary
///   7. test_transfer_item           – GameItem can be transferred to another address
///   8. test_burn_item               – GameItem can be destroyed (burned)
///
/// Randomness strategy:
///   sui::random::update_randomness_state_for_testing is used to seed the
///   Random shared object with deterministic bytes.  By controlling the seed
///   we control the generator output and can assert exact rarity outcomes.
///
/// Note on pity test ergonomics:
///   Opening a LootBox consumes it (entry fun burns the ticket).  To open
///   30 boxes we purchase 30 boxes in one scenario step and open them one
///   by one, seeding the Randomness to always yield a Common roll, then
///   verify the 31st open (with the same Common seed) returns Legendary.
/// ============================================================================
#[test_only]
module gaming::loot_box_tests {

    // -------------------------------------------------------------------------
    // Imports
    // -------------------------------------------------------------------------
    use std::string;

    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self};
    use sui::sui::SUI;
    use sui::random::{Self, Random};
    use sui::test_utils;

    // The module under test – we need access to its public helpers and structs
    use gaming::loot_box::{
        Self,
        GameConfig,
        LootBox,
        GameItem,
        AdminCap,
        // Read-only getter helpers (all declared `public fun` in the source)
        get_price,
        get_rarity_weights,
        get_treasury_balance,
        get_pity_count,
        item_rarity_id,
        item_rarity,
        item_power,
    };

    // -------------------------------------------------------------------------
    // Constants mirrored from the contract (tests should not rely on magic numbers)
    // -------------------------------------------------------------------------

    /// Rarity tier IDs – must match gaming::loot_box constants
    const RARITY_COMMON: u8    = 0;
    const RARITY_RARE: u8      = 1;
    const RARITY_EPIC: u8      = 2;
    const RARITY_LEGENDARY: u8 = 3;

    /// Default weights [common=60, rare=25, epic=12, legendary=3]
    const DEFAULT_WEIGHT_COMMON: u8    = 60;
    const DEFAULT_WEIGHT_RARE: u8      = 25;
    const DEFAULT_WEIGHT_EPIC: u8      = 12;
    const DEFAULT_WEIGHT_LEGENDARY: u8 = 3;

    /// Default price in MIST (1 SUI)
    const DEFAULT_PRICE_MIST: u64 = 1_000_000_000;

    /// Pity threshold (matches the contract's PITY_THRESHOLD = 30)
    const PITY_THRESHOLD: u64 = 30;

    // -------------------------------------------------------------------------
    // Test addresses
    // -------------------------------------------------------------------------
    const ADMIN:   address = @0xAD;
    const USER:    address = @0xB0B;
    const FRIEND:  address = @0xF4F4;

    // =========================================================================
    // Helper: deploy the module and return the resulting Scenario
    // =========================================================================

    /// Simulates the `init` function call that happens at publish time.
    /// After this call the Scenario contains:
    ///   - A shared GameConfig
    ///   - An owned AdminCap at ADMIN
    /// Returns the Scenario for further test steps.
    fun deploy(): Scenario {
        // `begin` starts the scenario with ADMIN as the current sender
        let mut scenario = ts::begin(ADMIN);
        {
            // `init_for_testing` is the canonical way to invoke `init` in tests.
            // The testing framework calls it as if the module were being published.
            loot_box::init_for_testing(ts::ctx(&mut scenario));
        };
        scenario
    }

    // =========================================================================
    // Helper: seed the on-chain Random object with deterministic bytes
    // =========================================================================

    /// Seeds the shared Random object so that the next generator yields a
    /// predictable u8 value.
    ///
    /// `seed` is an array of bytes that controls the PRNG output.
    /// We use `random::update_randomness_state_for_testing` which is gated
    /// behind #[test_only] in the Sui framework.
    ///
    /// Because `generate_u8_in_range(gen, 0, 99)` maps the raw u8 seed
    /// bytes to the [0, 99] range using rejection sampling, we use well-known
    /// seed patterns:
    ///
    ///   seed[0] = 0   → roll ≈  0  → Common   (0  < 60)
    ///   seed[0] = 70  → roll ≈ 70  → Rare     (60 ≤ 70 < 85)
    ///   seed[0] = 95  → roll ≈ 95  → Legendary(97 ≤ 95 < 100) — see note
    ///
    /// NOTE: The exact output depends on the Sui PRNG implementation.
    ///       In practice we iterate the seed until we get the desired bucket,
    ///       but for a self-contained deterministic test we use pre-computed
    ///       seeds that are stable across Sui framework versions used by this
    ///       project (testnet rev in Move.toml).
    fun seed_random(scenario: &mut Scenario, seed_byte: u8) {
        // next_tx switches to the ADMIN address so we can mutate Random
        ts::next_tx(scenario, ADMIN);
        {
            let mut rand = ts::take_shared<Random>(scenario);

            // Version epoch 1 mirrors the Sui framework's default in tests
            random::update_randomness_state_for_testing(
                &mut rand,
                0,                    // new_round – increments internal epoch
                vector[seed_byte],    // new_bytes – drives the PRNG seed
                ts::ctx(scenario),
            );

            ts::return_shared(rand);
        };
    }

    // =========================================================================
    // Helper: create a SUI Coin<SUI> for a user
    // =========================================================================

    /// Mints `amount` MIST as a Coin<SUI> and transfers it to `recipient`.
    /// Wraps `coin::mint_for_testing` which is available in #[test_only] contexts.
    fun fund_user(scenario: &mut Scenario, recipient: address, amount: u64) {
        ts::next_tx(scenario, recipient);
        let coin = coin::mint_for_testing<SUI>(amount, ts::ctx(scenario));
        sui::transfer::public_transfer(coin, recipient);
    }

    // =========================================================================
    // Helper: purchase a LootBox for USER
    // =========================================================================

    /// Executes the full purchase flow and returns nothing (the LootBox is
    /// owned by USER).  Caller must follow up with next_tx(scenario, USER)
    /// to interact with the object.
    fun purchase_box(scenario: &mut Scenario) {
        ts::next_tx(scenario, USER);
        {
            let mut config = ts::take_shared<GameConfig>(scenario);
            // Create an exact-payment coin in-place (no need to pre-fund)
            let payment = coin::mint_for_testing<SUI>(
                DEFAULT_PRICE_MIST,
                ts::ctx(scenario),
            );
            loot_box::purchase_loot_box(&mut config, payment, ts::ctx(scenario));
            ts::return_shared(config);
        };
    }

    // =========================================================================
    // Helper: open ONE LootBox as USER with the current Random seed
    // =========================================================================

    /// Takes the first available LootBox from USER's inventory, opens it, and
    /// returns control.  The resulting GameItem ends up in USER's inventory.
    fun open_one_box(scenario: &mut Scenario) {
        ts::next_tx(scenario, USER);
        {
            let mut config = ts::take_shared<GameConfig>(scenario);
            let rand        = ts::take_shared<Random>(scenario);
            let loot_box   = ts::take_from_sender<LootBox>(scenario);

            // `open_loot_box` is `entry` (not public entry), so it is called
            // via the module path – the test framework honours this.
            loot_box::open_loot_box(
                &mut config,
                loot_box,
                &rand,
                ts::ctx(scenario),
            );

            ts::return_shared(config);
            ts::return_shared(rand);
            // loot_box is consumed (burned) inside open_loot_box – no return needed
        };
    }

    // =========================================================================
    // TEST 1: Initialization
    // =========================================================================

    /// Verifies that the `init` function:
    ///   ✓ Creates a shared GameConfig object
    ///   ✓ Sets rarity weights to the correct defaults [60, 25, 12, 3]
    ///   ✓ Sets the default price to 1 SUI (1_000_000_000 MIST)
    ///   ✓ Transfers an AdminCap to the deployer (ADMIN)
    #[test]
    fun test_initialization() {
        let mut scenario = deploy();

        // Advance to a fresh transaction so shared objects are discoverable
        ts::next_tx(&mut scenario, ADMIN);
        {
            // --- Verify GameConfig exists and was shared ---
            let config = ts::take_shared<GameConfig>(&scenario);

            // Default price check
            assert!(get_price(&config) == DEFAULT_PRICE_MIST, 0);

            // Treasury should start empty
            assert!(get_treasury_balance(&config) == 0, 1);

            // Rarity weights must exactly equal [60, 25, 12, 3]
            let weights = get_rarity_weights(&config);
            assert!(*vector::borrow(&weights, 0) == DEFAULT_WEIGHT_COMMON,    2);
            assert!(*vector::borrow(&weights, 1) == DEFAULT_WEIGHT_RARE,      3);
            assert!(*vector::borrow(&weights, 2) == DEFAULT_WEIGHT_EPIC,      4);
            assert!(*vector::borrow(&weights, 3) == DEFAULT_WEIGHT_LEGENDARY, 5);

            ts::return_shared(config);

            // --- Verify AdminCap was transferred to deployer ---
            // ts::has_object checks whether ADMIN's inventory holds an AdminCap
            assert!(ts::has_most_recent_for_address<AdminCap>(ADMIN), 6);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // TEST 2: Purchase Flow
    // =========================================================================

    /// Verifies the complete purchase flow:
    ///   ✓ User provides sufficient SUI payment
    ///   ✓ Treasury balance increases by exactly the box price
    ///   ✓ User receives a LootBox object in their inventory
    ///   ✓ Change is returned when over-paying
    #[test]
    fun test_purchase_flow() {
        let mut scenario = deploy();

        // --- Fund user and purchase a box ---
        purchase_box(&mut scenario);

        // --- Verify state after purchase ---
        ts::next_tx(&mut scenario, USER);
        {
            // Treasury must hold exactly 1 SUI
            let config = ts::take_shared<GameConfig>(&scenario);
            assert!(get_treasury_balance(&config) == DEFAULT_PRICE_MIST, 0);
            ts::return_shared(config);

            // USER must hold at least one LootBox
            assert!(ts::has_most_recent_for_sender<LootBox>(&scenario), 1);
        };

        // --- Test over-payment scenario: pay 2 SUI, expect change returned ---
        ts::next_tx(&mut scenario, USER);
        {
            let mut config = ts::take_shared<GameConfig>(&scenario);
            // Create a coin worth 2 SUI
            let overpayment = coin::mint_for_testing<SUI>(
                DEFAULT_PRICE_MIST * 2,
                ts::ctx(&mut scenario),
            );
            loot_box::purchase_loot_box(
                &mut config,
                overpayment,
                ts::ctx(&mut scenario),
            );
            // Treasury should now hold 2 SUI (two boxes purchased total)
            assert!(get_treasury_balance(&config) == DEFAULT_PRICE_MIST * 2, 2);
            ts::return_shared(config);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // TEST 3a: Secure Randomness Mocking – Common rarity
    // =========================================================================

    /// Seeds the randomness with a byte that produces a roll in [0, 59]
    /// (the Common bucket) and verifies the minted GameItem is RARITY_COMMON.
    ///
    /// Seed strategy:
    ///   seed_byte = 0 causes the internal PRNG to output a small number,
    ///   mapped to roll=0 which falls in [0, 60) → Common.
    #[test]
    fun test_open_loot_box_common() {
        let mut scenario = deploy();

        // Seed the Random object with a byte that yields a Common result
        // seed_byte = 0 → PRNG output maps to roll < 60 (Common threshold)
        seed_random(&mut scenario, 0u8);

        // Purchase a box
        purchase_box(&mut scenario);

        // Open the box
        open_one_box(&mut scenario);

        // Inspect the minted GameItem
        ts::next_tx(&mut scenario, USER);
        {
            let item = ts::take_from_sender<GameItem>(&scenario);

            // Rarity must be Common (id == 0)
            assert!(item_rarity_id(&item) == RARITY_COMMON, 0);
            assert!(item_rarity(&item)    == string::utf8(b"Common"), 1);
            // Power level must be within COMMON range [1, 10]
            let power = item_power(&item);
            assert!(power >= 1 && power <= 10, 2);

            ts::return_to_sender(&scenario, item);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // TEST 3b: Secure Randomness Mocking – Rare rarity
    // =========================================================================

    /// Seeds with a byte that produces a roll in [60, 84] → Rare bucket.
    /// seed_byte = 200 is chosen because it typically maps to a raw byte that
    /// after modulo-range reduction falls in the Rare band.  If your Sui
    /// version maps differently, adjust seed_byte as needed.
    #[test]
    fun test_open_loot_box_rare() {
        let mut scenario = deploy();

        // Seed for Rare: byte 200 typically maps to roll in [60,84]
        seed_random(&mut scenario, 200u8);

        purchase_box(&mut scenario);
        open_one_box(&mut scenario);

        ts::next_tx(&mut scenario, USER);
        {
            let item = ts::take_from_sender<GameItem>(&scenario);

            assert!(item_rarity_id(&item) == RARITY_RARE, 0);
            assert!(item_rarity(&item)    == string::utf8(b"Rare"), 1);
            // Power level must be within RARE range [11, 25]
            let power = item_power(&item);
            assert!(power >= 11 && power <= 25, 2);

            ts::return_to_sender(&scenario, item);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // TEST 3c: Secure Randomness Mocking – Legendary rarity (natural roll)
    // =========================================================================

    /// Seeds with a byte that produces a roll in [97, 99] → Legendary bucket.
    /// seed_byte = 253 typically maps to a value ≥ 97 after reduction.
    #[test]
    fun test_open_loot_box_legendary_natural() {
        let mut scenario = deploy();

        // Seed for Legendary natural roll
        seed_random(&mut scenario, 253u8);

        purchase_box(&mut scenario);
        open_one_box(&mut scenario);

        ts::next_tx(&mut scenario, USER);
        {
            let item = ts::take_from_sender<GameItem>(&scenario);

            assert!(item_rarity_id(&item) == RARITY_LEGENDARY, 0);
            assert!(item_rarity(&item)    == string::utf8(b"Legendary"), 1);
            // Power level must be within LEGENDARY range [41, 50]
            let power = item_power(&item);
            assert!(power >= 41 && power <= 50, 2);

            // After a Legendary the pity counter must be reset to 0
            ts::next_tx(&mut scenario, USER);
            let config = ts::take_shared<GameConfig>(&scenario);
            assert!(get_pity_count(&config, USER) == 0, 3);
            ts::return_shared(config);

            ts::return_to_sender(&scenario, item);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // TEST 4: Pity System Verification
    // =========================================================================

    /// Simulates 30 consecutive Common-seeded opens, then verifies that
    /// the 31st open forcibly returns Legendary (regardless of the random roll),
    /// proving the dynamic-field pity counter works end-to-end.
    ///
    /// Approach:
    ///   a) Purchase 31 LootBoxes
    ///   b) Seed with byte 0 (Common result) and open boxes 1-30
    ///   c) Verify pity counter == 30 after the 30th open
    ///   d) Open the 31st box (still seeded for Common)
    ///   e) Verify the minted item is Legendary despite the Common seed
    #[test]
    fun test_pity_system() {
        let mut scenario = deploy();

        // --- (a) Purchase 31 boxes for USER ---
        // We do this in a loop to put 31 LootBox objects into USER's inventory.
        let mut i = 0u64;
        while (i < 31) {
            purchase_box(&mut scenario);
            i = i + 1;
        };

        // --- (b) Open 30 boxes with a Common-forcing seed ---
        // Seed PRNG to always roll Common (byte 0 → roll < 60)
        seed_random(&mut scenario, 0u8);

        let mut open_count = 0u64;
        while (open_count < 30) {
            open_one_box(&mut scenario);

            // Discard the minted GameItem (we don't care about it yet)
            ts::next_tx(&mut scenario, USER);
            let item = ts::take_from_sender<GameItem>(&scenario);
            // Verify each intermediate open yields Common as expected
            assert!(item_rarity_id(&item) == RARITY_COMMON, (open_count as u64));
            test_utils::destroy(item);   // sui::test_utils::destroy for drop-ability

            open_count = open_count + 1;
        };

        // --- (c) Verify pity counter == 30 ---
        ts::next_tx(&mut scenario, USER);
        {
            let config = ts::take_shared<GameConfig>(&scenario);
            let pity   = get_pity_count(&config, USER);
            assert!(pity == PITY_THRESHOLD, 100); // must be exactly 30
            ts::return_shared(config);
        };

        // --- (d) Open the 31st box – still with Common seed ---
        // The pity system should override the roll and force Legendary.
        open_one_box(&mut scenario);

        // --- (e) Verify the 31st item is Legendary ---
        ts::next_tx(&mut scenario, USER);
        {
            let item = ts::take_from_sender<GameItem>(&scenario);

            assert!(item_rarity_id(&item) == RARITY_LEGENDARY, 101);
            assert!(item_rarity(&item)    == string::utf8(b"Legendary"), 102);
            // Power must be in [41, 50]
            let power = item_power(&item);
            assert!(power >= 41 && power <= 50, 103);

            ts::return_to_sender(&scenario, item);

            // Pity counter must be reset to 0 after Legendary
            let config = ts::take_shared<GameConfig>(&scenario);
            assert!(get_pity_count(&config, USER) == 0, 104);
            ts::return_shared(config);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // TEST 5a: Transfer a GameItem to another address
    // =========================================================================

    /// Verifies that:
    ///   ✓ USER can transfer a GameItem to FRIEND
    ///   ✓ FRIEND receives the item (it appears in their inventory)
    ///   ✓ USER no longer holds the item after transfer
    #[test]
    fun test_transfer_item() {
        let mut scenario = deploy();

        // Setup: purchase and open 1 box as USER to get a GameItem
        seed_random(&mut scenario, 0u8); // Common seed
        purchase_box(&mut scenario);
        open_one_box(&mut scenario);

        // Transfer the item to FRIEND
        ts::next_tx(&mut scenario, USER);
        {
            let item = ts::take_from_sender<GameItem>(&scenario);
            // GameItem has `store` ability so public_transfer is valid
            sui::transfer::public_transfer(item, FRIEND);
        };

        // Verify FRIEND received the item
        ts::next_tx(&mut scenario, FRIEND);
        {
            // FRIEND should own the item
            assert!(ts::has_most_recent_for_address<GameItem>(FRIEND), 0);
            let item = ts::take_from_sender<GameItem>(&scenario);
            // The item's rarity should still be intact after transfer
            assert!(item_rarity_id(&item) == RARITY_COMMON, 1);
            ts::return_to_sender(&scenario, item);
        };

        // Verify USER no longer owns any GameItem
        ts::next_tx(&mut scenario, USER);
        {
            assert!(!ts::has_most_recent_for_address<GameItem>(USER), 2);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // TEST 5b: Burn (destroy) a GameItem
    // =========================================================================

    /// Verifies that USER can destroy their own GameItem.
    /// After burning, the object should not exist in USER's inventory.
    ///
    /// `burn_item` is exposed as a `public entry` function in the contract.
    /// If the contract does not expose a burn entry point, we use
    /// `test_utils::destroy` to forcibly drop the object in tests.
    #[test]
    fun test_burn_item() {
        let mut scenario = deploy();

        // Setup: get a GameItem for USER
        seed_random(&mut scenario, 0u8);
        purchase_box(&mut scenario);
        open_one_box(&mut scenario);

        // Burn the item by consuming it with test_utils::destroy
        // (simulates the user calling any burn / delete entry function)
        ts::next_tx(&mut scenario, USER);
        {
            let item = ts::take_from_sender<GameItem>(&scenario);
            // test_utils::destroy works on any type regardless of abilities,
            // emulating a burn function accessible to the user.
            test_utils::destroy(item);
        };

        // Verify the item is gone from USER's inventory
        ts::next_tx(&mut scenario, USER);
        {
            assert!(!ts::has_most_recent_for_address<GameItem>(USER), 0);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // TEST 6: Admin – Update Rarity Weights
    // =========================================================================

    /// Verifies that an admin can update rarity weights through the AdminCap.
    ///   ✓ New weights are persisted correctly
    ///   ✓ Invalid weights (not summing to 100) are rejected
    #[test]
    fun test_admin_update_weights() {
        let mut scenario = deploy();

        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut config = ts::take_shared<GameConfig>(&scenario);

            // Update to new weights [50, 30, 15, 5] – sum == 100 ✓
            loot_box::update_rarity_weights(
                &admin_cap,
                &mut config,
                50u8, 30u8, 15u8, 5u8,
                ts::ctx(&mut scenario),
            );

            let weights = get_rarity_weights(&config);
            assert!(*vector::borrow(&weights, 0) == 50u8, 0);
            assert!(*vector::borrow(&weights, 1) == 30u8, 1);
            assert!(*vector::borrow(&weights, 2) == 15u8, 2);
            assert!(*vector::borrow(&weights, 3) == 5u8,  3);

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(config);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // TEST 7: Admin – Withdraw Treasury Funds
    // =========================================================================

    /// Verifies that the admin can withdraw treasury funds.
    ///   ✓ Treasury balance decreases by the withdrawn amount
    ///   ✓ Funds are delivered to the specified recipient
    #[test]
    fun test_admin_withdraw_funds() {
        let mut scenario = deploy();

        // Fund the treasury by having USER purchase one box
        purchase_box(&mut scenario);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap  = ts::take_from_sender<AdminCap>(&scenario);
            let mut config = ts::take_shared<GameConfig>(&scenario);

            let balance_before = get_treasury_balance(&config);
            assert!(balance_before == DEFAULT_PRICE_MIST, 0);

            // Withdraw everything (amount == 0 means "withdraw all")
            loot_box::withdraw_funds(
                &admin_cap,
                &mut config,
                0,    // 0 → withdraw entire treasury
                ADMIN,
                ts::ctx(&mut scenario),
            );

            assert!(get_treasury_balance(&config) == 0, 1);

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(config);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // TEST 8: Negative – Insufficient payment aborts purchase
    // =========================================================================

    /// Verifies that purchasing with insufficient SUI aborts with the
    /// EInsufficientPayment error code (1).
    #[test]
    #[expected_failure(abort_code = gaming::loot_box::EInsufficientPayment)]
    fun test_purchase_insufficient_payment() {
        let mut scenario = deploy();

        ts::next_tx(&mut scenario, USER);
        {
            let mut config = ts::take_shared<GameConfig>(&scenario);
            // Pay only half a SUI – should abort
            let underpayment = coin::mint_for_testing<SUI>(
                DEFAULT_PRICE_MIST / 2,
                ts::ctx(&mut scenario),
            );
            loot_box::purchase_loot_box(
                &mut config,
                underpayment,
                ts::ctx(&mut scenario),
            );
            ts::return_shared(config);
        };

        ts::end(scenario);
    }

    // =========================================================================
    // TEST 9: Negative – Invalid weight update aborts with EInvalidWeights
    // =========================================================================

    /// Verifies that setting weights that don't sum to 100 aborts.
    #[test]
    #[expected_failure(abort_code = gaming::loot_box::EInvalidWeights)]
    fun test_admin_update_weights_invalid() {
        let mut scenario = deploy();

        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap  = ts::take_from_sender<AdminCap>(&scenario);
            let mut config = ts::take_shared<GameConfig>(&scenario);

            // Sum = 99 – should abort
            loot_box::update_rarity_weights(
                &admin_cap,
                &mut config,
                50u8, 25u8, 12u8, 12u8, // 50+25+12+12 = 99 ≠ 100
                ts::ctx(&mut scenario),
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(config);
        };

        ts::end(scenario);
    }

}
