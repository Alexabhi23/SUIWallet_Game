/// Module: gaming::loot_box
/// Description: A secure on-chain Gaming Loot Box System on Sui.
/// Features:
///   - Purchase loot boxes with SUI coin
///   - Open boxes using native Sui on-chain randomness (Random object)
///   - Tiered rarity system: Common / Rare / Epic / Legendary
///   - Pity system: guarantees Legendary after 30 consecutive non-Legendary opens
///   - sui::display standard setup for GameItem NFTs
///   - AdminCap-gated weight updates and treasury withdrawals
///   - LootBoxOpened event emission
module gaming::loot_box {

    // =========================================================================
    // Imports
    // =========================================================================
    use std::string::{Self, String};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::event;
    use sui::random::{Self, Random};
    use sui::dynamic_field;
    use sui::display;
    use sui::package;

    // =========================================================================
    // Constants
    // =========================================================================

    /// Rarity tier IDs (u8 for compact storage)
    const RARITY_COMMON: u8    = 0;
    const RARITY_RARE: u8      = 1;
    const RARITY_EPIC: u8      = 2;
    const RARITY_LEGENDARY: u8 = 3;

    /// Default rarity weights (must sum to 100)
    const DEFAULT_WEIGHT_COMMON: u8    = 60;
    const DEFAULT_WEIGHT_RARE: u8      = 25;
    const DEFAULT_WEIGHT_EPIC: u8      = 12;
    const DEFAULT_WEIGHT_LEGENDARY: u8 = 3;

    /// Pity threshold: guarantee Legendary on the 31st consecutive open
    const PITY_THRESHOLD: u64 = 30;

    /// Default loot box price in MIST (1 SUI = 1_000_000_000 MIST)
    const DEFAULT_PRICE_MIST: u64 = 1_000_000_000; // 1 SUI

    // =========================================================================
    // Error codes
    // =========================================================================
    public const EInsufficientPayment: u64 = 1;
    public const EInvalidWeights: u64      = 2;
    public const EInsufficientFunds: u64   = 3;

    // =========================================================================
    // One-Time Witness (for sui::display / sui::package)
    // =========================================================================

    /// OTW – must match the module name in ALL_CAPS
    public struct LOOT_BOX has drop {}

    // =========================================================================
    // Core Structs
    // =========================================================================

    /// Shared config object. Holds rarity weights, price, and the treasury.
    public struct GameConfig has key {
        id: UID,
        /// Rarity weights [common, rare, epic, legendary] (must sum to 100)
        rarity_weights: vector<u8>,
        /// Price per loot box in MIST
        price: u64,
        /// Accumulated SUI from box purchases
        treasury: Balance<SUI>,
    }

    /// Owned ticket object – burned when a box is opened.
    public struct LootBox has key, store {
        id: UID,
    }

    /// Owned NFT minted when a box is opened.
    public struct GameItem has key, store {
        id: UID,
        /// Human-readable item name (e.g. "Legendary Sword")
        name: String,
        /// Rarity tier as a readable string (e.g. "Legendary")
        rarity: String,
        /// Raw rarity id stored for efficient comparisons
        rarity_id: u8,
        /// Power level within the rarity tier's range
        power_level: u8,
    }

    /// Admin capability – held by deployer to manage config and treasury.
    public struct AdminCap has key, store {
        id: UID,
    }

    // =========================================================================
    // Events
    // =========================================================================

    /// Emitted every time a loot box is successfully opened.
    public struct LootBoxOpened has copy, drop {
        /// Object ID of the minted GameItem
        item_id: ID,
        /// Rarity as a string ("Common", "Rare", "Epic", "Legendary")
        rarity: String,
        /// Power level of the minted item
        power: u8,
        /// Address of the user who opened the box
        owner: address,
    }

    // =========================================================================
    // Helper: dynamic-field key for pity counter
    // =========================================================================

    /// Wrapper struct used as a typed key for dynamic fields on GameConfig.
    public struct PityKey has copy, drop, store {
        owner: address,
    }

    // =========================================================================
    // Initialization
    // =========================================================================

    /// Called once at publish time.
    /// Creates the shared GameConfig, transfers AdminCap to deployer,
    /// and sets up sui::display for GameItem NFTs.
    fun init(otw: LOOT_BOX, ctx: &mut TxContext) {
        // --- Publisher & Display setup for GameItem ---
        let publisher = package::claim(otw, ctx);

        let mut display_obj = display::new<GameItem>(&publisher, ctx);
        display::add(&mut display_obj, string::utf8(b"name"),        string::utf8(b"{name}"));
        display::add(&mut display_obj, string::utf8(b"description"), string::utf8(b"A {rarity} game item with power level {power_level}."));
        display::add(&mut display_obj, string::utf8(b"rarity"),      string::utf8(b"{rarity}"));
        display::add(&mut display_obj, string::utf8(b"power_level"), string::utf8(b"{power_level}"));
        display::update_version(&mut display_obj);

        // Transfer the display object and publisher to the deployer
        transfer::public_transfer(display_obj, ctx.sender());
        transfer::public_transfer(publisher, ctx.sender());

        // --- AdminCap: give control to the deployer ---
        let admin_cap = AdminCap { id: object::new(ctx) };
        transfer::transfer(admin_cap, ctx.sender());

        // --- GameConfig: shared object accessible by all ---
        let config = GameConfig {
            id: object::new(ctx),
            rarity_weights: vector[
                DEFAULT_WEIGHT_COMMON,
                DEFAULT_WEIGHT_RARE,
                DEFAULT_WEIGHT_EPIC,
                DEFAULT_WEIGHT_LEGENDARY,
            ],
            price: DEFAULT_PRICE_MIST,
            treasury: balance::zero<SUI>(),
        };
        transfer::share_object(config);
    }

    // =========================================================================
    // Test-only Helpers
    // =========================================================================

    /// Wrapper that lets test scenarios call `init` directly.
    /// Gated by #[test_only] so it is never compiled into production bytecode.
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(LOOT_BOX {}, ctx);
    }

    // =========================================================================
    // Purchase
    // =========================================================================

    /// Purchase a LootBox by paying the configured price in SUI.
    /// The payment is added to the config's treasury.
    /// A new LootBox object is transferred to the buyer.
    public entry fun purchase_loot_box(
        config: &mut GameConfig,
        mut payment: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        let price = config.price;
        assert!(coin::value(&payment) >= price, EInsufficientPayment);

        // Split exact price and deposit into treasury
        let paid = coin::split(&mut payment, price, ctx);
        balance::join(&mut config.treasury, coin::into_balance(paid));

        // Return any change to the buyer
        if (coin::value(&payment) > 0) {
            transfer::public_transfer(payment, ctx.sender());
        } else {
            coin::destroy_zero(payment);
        };

        // Mint and transfer the loot box ticket
        let loot_box = LootBox { id: object::new(ctx) };
        transfer::transfer(loot_box, ctx.sender());
    }

    // =========================================================================
    // Open Loot Box (Secure Entry with Randomness + Pity System)
    // =========================================================================

    /// Opens a LootBox and mints a GameItem NFT using Sui on-chain randomness.
    ///
    /// Declared as `entry` (NOT `public entry`) to prevent PTB composition
    /// attacks – callers cannot chain the output GameItem inside the same PTB.
    ///
    /// Pity system:
    ///   Each user has a per-address fail counter stored as a dynamic field on
    ///   GameConfig. Every non-Legendary open increments the counter; after
    ///   PITY_THRESHOLD consecutive non-Legendary opens the next roll is forced
    ///   to Legendary and the counter resets to 0.
    entry fun open_loot_box(
        config: &mut GameConfig,
        box: LootBox,
        r: &Random,
        ctx: &mut TxContext,
    ) {
        // Burn the loot box ticket
        let LootBox { id: box_id } = box;
        object::delete(box_id);

        let sender = ctx.sender();

        // ---------------------------------------------------------------
        // Pity counter management
        // ---------------------------------------------------------------
        let pity_key = PityKey { owner: sender };
        // Read existing pity counter (default 0 if first time)
        let pity_count: u64 = if (dynamic_field::exists_(&config.id, pity_key)) {
            *dynamic_field::borrow<PityKey, u64>(&config.id, pity_key)
        } else {
            0
        };

        // ---------------------------------------------------------------
        // Randomness – generate rarity and power
        // ---------------------------------------------------------------
        let mut gen = random::new_generator(r, ctx);

        // Determine rarity
        let (rarity_id, rarity_name) = if (pity_count >= PITY_THRESHOLD) {
            // Force Legendary  – pity triggered
            (RARITY_LEGENDARY, string::utf8(b"Legendary"))
        } else {
            // Roll 0-99 against cumulative rarity weights
            let roll = random::generate_u8_in_range(&mut gen, 0, 99);
            let weights = &config.rarity_weights;
            let w_common    = *vector::borrow(weights, 0);
            let w_rare      = *vector::borrow(weights, 1);
            let w_epic      = *vector::borrow(weights, 2);
            // Legendary is the remainder (index 3)

            if (roll < w_common) {
                (RARITY_COMMON, string::utf8(b"Common"))
            } else if (roll < w_common + w_rare) {
                (RARITY_RARE, string::utf8(b"Rare"))
            } else if (roll < w_common + w_rare + w_epic) {
                (RARITY_EPIC, string::utf8(b"Epic"))
            } else {
                (RARITY_LEGENDARY, string::utf8(b"Legendary"))
            }
        };

        // Determine power level based on rarity tier
        // Common: 1-10 | Rare: 11-25 | Epic: 26-40 | Legendary: 41-50
        let power_level: u8 = if (rarity_id == RARITY_COMMON) {
            random::generate_u8_in_range(&mut gen, 1, 10)
        } else if (rarity_id == RARITY_RARE) {
            random::generate_u8_in_range(&mut gen, 11, 25)
        } else if (rarity_id == RARITY_EPIC) {
            random::generate_u8_in_range(&mut gen, 26, 40)
        } else {
            // Legendary
            random::generate_u8_in_range(&mut gen, 41, 50)
        };

        // ---------------------------------------------------------------
        // Update pity counter
        // ---------------------------------------------------------------
        if (rarity_id == RARITY_LEGENDARY) {
            // Reset counter on Legendary drop
            if (dynamic_field::exists_(&config.id, pity_key)) {
                *dynamic_field::borrow_mut<PityKey, u64>(&mut config.id, pity_key) = 0;
            } else {
                dynamic_field::add(&mut config.id, pity_key, 0u64);
            }
        } else {
            // Increment counter for non-Legendary rolls
            if (dynamic_field::exists_(&config.id, pity_key)) {
                let counter = dynamic_field::borrow_mut<PityKey, u64>(&mut config.id, pity_key);
                *counter = *counter + 1;
            } else {
                dynamic_field::add(&mut config.id, pity_key, 1u64);
            }
        };

        // ---------------------------------------------------------------
        // Compose item name
        // ---------------------------------------------------------------
        // e.g. "Legendary Item", "Rare Item" etc.
        let mut item_name = rarity_name;
        string::append_utf8(&mut item_name, b" Item");

        // ---------------------------------------------------------------
        // Mint GameItem NFT
        // ---------------------------------------------------------------
        let item_uid = object::new(ctx);
        let item_id  = object::uid_to_inner(&item_uid);

        let game_item = GameItem {
            id: item_uid,
            name: item_name,
            rarity: rarity_name,
            rarity_id,
            power_level,
        };

        // ---------------------------------------------------------------
        // Emit event
        // ---------------------------------------------------------------
        event::emit(LootBoxOpened {
            item_id,
            rarity: rarity_name,
            power: power_level,
            owner: sender,
        });

        // Transfer the minted NFT to the opener
        transfer::transfer(game_item, sender);
    }

    // =========================================================================
    // Admin Functions
    // =========================================================================

    /// Update the four rarity weights. Requires AdminCap.
    /// Weights must sum to exactly 100.
    public entry fun update_rarity_weights(
        _cap: &AdminCap,
        config: &mut GameConfig,
        w_common: u8,
        w_rare: u8,
        w_epic: u8,
        w_legendary: u8,
        _ctx: &mut TxContext,
    ) {
        let total = (w_common as u64)
            + (w_rare as u64)
            + (w_epic as u64)
            + (w_legendary as u64);
        assert!(total == 100, EInvalidWeights);

        config.rarity_weights = vector[w_common, w_rare, w_epic, w_legendary];
    }

    /// Update the loot box price. Requires AdminCap.
    public entry fun update_price(
        _cap: &AdminCap,
        config: &mut GameConfig,
        new_price: u64,
        _ctx: &mut TxContext,
    ) {
        config.price = new_price;
    }

    /// Withdraw accumulated funds from the treasury. Requires AdminCap.
    /// `amount` is in MIST; use 0 to withdraw everything.
    public entry fun withdraw_funds(
        _cap: &AdminCap,
        config: &mut GameConfig,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext,
    ) {
        let available = balance::value(&config.treasury);
        let withdraw_amount = if (amount == 0 || amount > available) {
            available
        } else {
            amount
        };
        assert!(withdraw_amount > 0, EInsufficientFunds);

        let withdrawn = coin::from_balance(
            balance::split(&mut config.treasury, withdraw_amount),
            ctx,
        );
        transfer::public_transfer(withdrawn, recipient);
    }

    // =========================================================================
    // View / Read-only helpers (non-entry, callable via off-chain devInspect)
    // =========================================================================

    /// Returns the current price of a loot box.
    public fun get_price(config: &GameConfig): u64 {
        config.price
    }

    /// Returns a copy of the current rarity weights vector.
    public fun get_rarity_weights(config: &GameConfig): vector<u8> {
        config.rarity_weights
    }

    /// Returns the current treasury balance in MIST.
    public fun get_treasury_balance(config: &GameConfig): u64 {
        balance::value(&config.treasury)
    }

    /// Returns the pity counter for a given address (0 if never tracked).
    public fun get_pity_count(config: &GameConfig, owner: address): u64 {
        let key = PityKey { owner };
        if (dynamic_field::exists_(&config.id, key)) {
            *dynamic_field::borrow<PityKey, u64>(&config.id, key)
        } else {
            0
        }
    }

    /// Returns the power level of a GameItem.
    public fun item_power(item: &GameItem): u8 {
        item.power_level
    }

    /// Returns the rarity id (0-3) of a GameItem.
    public fun item_rarity_id(item: &GameItem): u8 {
        item.rarity_id
    }

    /// Returns the rarity string of a GameItem.
    public fun item_rarity(item: &GameItem): String {
        item.rarity
    }

    /// Returns the name of a GameItem.
    public fun item_name(item: &GameItem): String {
        item.name
    }
}
