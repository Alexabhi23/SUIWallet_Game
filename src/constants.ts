// ─────────────────────────────────────────────────────────────
//  Contract addresses – replace with your deployed values
// ─────────────────────────────────────────────────────────────

/** The deployed Move package ID */
export const PACKAGE_ID =
    '0x0000000000000000000000000000000000000000000000000000000000000000';

/** Shared GameConfig object */
export const GAME_CONFIG_ID =
    '0x0000000000000000000000000000000000000000000000000000000000000001';

/** Sui system Random shared object (always 0x8) */
export const RANDOM_OBJECT_ID = '0x8';

// Move module paths
export const LOOT_BOX_MODULE = `${PACKAGE_ID}::loot_box`;
export const GAME_ITEM_MODULE = `${PACKAGE_ID}::game_item`;

// Fully-qualified struct types (used for object filtering)
export const LOOT_BOX_TYPE = `${LOOT_BOX_MODULE}::LootBox`;
export const GAME_ITEM_TYPE = `${GAME_ITEM_MODULE}::GameItem`;

// Event type
export const LOOT_BOX_OPENED_EVENT = `${LOOT_BOX_MODULE}::LootBoxOpened`;

// ─────────────────────────────────────────────────────────────
//  Loot box tiers displayed in the Store
// ─────────────────────────────────────────────────────────────
export interface BoxTier {
    id: string;
    name: string;
    price: string;
    priceInMist: bigint;
    odds: { label: string; chance: string; color: string }[];
    accentColor: string;
    glowClass: string;
    borderClass: string;
}

export const BOX_TIERS: BoxTier[] = [
    {
        id: 'standard',
        name: 'Standard Box',
        price: '0.5 SUI',
        priceInMist: BigInt(500_000_000),
        odds: [
            { label: 'Common', chance: '60%', color: '#94a3b8' },
            { label: 'Rare', chance: '25%', color: '#60a5fa' },
            { label: 'Epic', chance: '12%', color: '#a855f7' },
            { label: 'Legendary', chance: '3%', color: '#fbbf24' },
        ],
        accentColor: '#60a5fa',
        glowClass: 'shadow-[0_0_30px_rgba(96,165,250,0.4)]',
        borderClass: 'border-blue-500/40',
    },
    {
        id: 'premium',
        name: 'Premium Box',
        price: '2 SUI',
        priceInMist: BigInt(2_000_000_000),
        odds: [
            { label: 'Common', chance: '30%', color: '#94a3b8' },
            { label: 'Rare', chance: '35%', color: '#60a5fa' },
            { label: 'Epic', chance: '25%', color: '#a855f7' },
            { label: 'Legendary', chance: '10%', color: '#fbbf24' },
        ],
        accentColor: '#a855f7',
        glowClass: 'shadow-[0_0_30px_rgba(168,85,247,0.5)]',
        borderClass: 'border-purple-500/40',
    },
    {
        id: 'legendary',
        name: 'Legendary Box',
        price: '5 SUI',
        priceInMist: BigInt(5_000_000_000),
        odds: [
            { label: 'Common', chance: '10%', color: '#94a3b8' },
            { label: 'Rare', chance: '25%', color: '#60a5fa' },
            { label: 'Epic', chance: '35%', color: '#a855f7' },
            { label: 'Legendary', chance: '30%', color: '#fbbf24' },
        ],
        accentColor: '#fbbf24',
        glowClass: 'shadow-[0_0_30px_rgba(251,191,36,0.6)]',
        borderClass: 'border-yellow-500/40',
    },
];

// ─────────────────────────────────────────────────────────────
//  Rarity config
// ─────────────────────────────────────────────────────────────
export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export const RARITY_CONFIG: Record<Rarity, {
    color: string;
    gradient: string;
    glow: string;
    label: string;
}> = {
    Common: {
        color: '#94a3b8',
        gradient: 'from-slate-500 to-slate-400',
        glow: '0 0 20px rgba(148,163,184,0.4)',
        label: 'Common',
    },
    Rare: {
        color: '#60a5fa',
        gradient: 'from-blue-600 to-blue-400',
        glow: '0 0 20px rgba(96,165,250,0.6)',
        label: 'Rare',
    },
    Epic: {
        color: '#a855f7',
        gradient: 'from-purple-700 to-fuchsia-400',
        glow: '0 0 30px rgba(168,85,247,0.7)',
        label: 'Epic',
    },
    Legendary: {
        color: '#fbbf24',
        gradient: 'from-yellow-600 to-amber-300',
        glow: '0 0 40px rgba(251,191,36,0.8)',
        label: 'Legendary',
    },
};
