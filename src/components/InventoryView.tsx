import { useState } from 'react';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { motion } from 'framer-motion';
import { GAME_ITEM_TYPE, Rarity, RARITY_CONFIG } from '../constants';
import RarityBadge from './RarityBadge';

interface GameItemFields {
    rarity?: number;
    power_level?: number;
    name?: string;
}

interface GameItemObject {
    data: {
        objectId: string;
        content?: {
            dataType: string;
            fields?: GameItemFields;
        };
    };
}

const RARITY_NUM_MAP: Record<number, Rarity> = {
    0: 'Common',
    1: 'Rare',
    2: 'Epic',
    3: 'Legendary',
};

function ItemCard({ item, idx }: { item: GameItemObject; idx: number }) {
    const [flipped, setFlipped] = useState(false);
    const fields = item.data.content?.fields ?? {};
    const rarityNum = typeof fields.rarity === 'number' ? fields.rarity : 0;
    const rarity: Rarity = RARITY_NUM_MAP[rarityNum] ?? 'Common';
    const powerLevel = typeof fields.power_level === 'number' ? fields.power_level : 0;
    const name = typeof fields.name === 'string' ? fields.name : `${rarity} Item`;
    const cfg = RARITY_CONFIG[rarity];
    const objectId = item.data.objectId;

    return (
        <motion.div
            id={`inventory-item-${objectId.slice(-6)}`}
            className="relative cursor-pointer"
            style={{ perspective: '1000px' }}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: idx * 0.06 }}
            onClick={() => setFlipped(f => !f)}
            whileHover={{ y: -4 }}
        >
            <motion.div
                className="relative w-full"
                style={{ transformStyle: 'preserve-3d', transition: 'transform 0.6s' }}
                animate={{ rotateY: flipped ? 180 : 0 }}
            >
                {/* Front */}
                <div
                    className="glass-card p-4 flex flex-col gap-3 border backface-hidden"
                    style={{
                        borderColor: `${cfg.color}55`,
                        boxShadow: cfg.glow,
                    }}
                >
                    {/* Image */}
                    <div
                        className="w-full aspect-square rounded-xl overflow-hidden relative"
                        style={{ background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}11)` }}
                    >
                        <img
                            src={`https://api.dicebear.com/9.x/shapes/svg?seed=${objectId}&backgroundColor=${cfg.color.replace('#', '')}`}
                            alt={name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                const el = e.target as HTMLImageElement;
                                el.style.display = 'none';
                                const parent = el.parentElement!;
                                parent.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:3rem;">⚔️</div>`;
                            }}
                        />
                        <div className="absolute inset-0 shimmer-bg pointer-events-none" />
                    </div>

                    <div>
                        <p className="text-sm font-bold text-white truncate">{name}</p>
                        <div className="flex items-center justify-between mt-1.5 gap-2">
                            <RarityBadge rarity={rarity} size="sm" />
                            <span className="text-xs font-mono text-slate-400">PWR <span className="font-bold" style={{ color: cfg.color }}>{powerLevel}</span></span>
                        </div>
                    </div>
                </div>

                {/* Back (rotated 180deg) */}
                <div
                    className="glass-card p-4 flex flex-col gap-2 items-center justify-center border absolute inset-0"
                    style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        borderColor: `${cfg.color}55`,
                        boxShadow: cfg.glow,
                    }}
                >
                    <div className="text-3xl mb-2">⚔️</div>
                    <p className="text-xs text-slate-400 text-center">Object ID</p>
                    <p className="text-xs font-mono text-purple-400 break-all text-center">
                        {objectId.slice(0, 12)}…{objectId.slice(-6)}
                    </p>
                    <div className="mt-2 w-full">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500">Power</span>
                            <span style={{ color: cfg.color }} className="font-bold">{powerLevel}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5">
                            <div
                                className="h-1.5 rounded-full"
                                style={{ width: `${Math.min(powerLevel, 100)}%`, background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}88)` }}
                            />
                        </div>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">Click to flip back</p>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default function InventoryView() {
    const account = useCurrentAccount();
    const [filter, setFilter] = useState<Rarity | 'All'>('All');

    const { data, isLoading, error } = useSuiClientQuery(
        'getOwnedObjects',
        {
            owner: account?.address ?? '',
            filter: { StructType: GAME_ITEM_TYPE },
            options: { showContent: true, showType: true },
        },
        { enabled: !!account?.address }
    );

    if (!account) {
        return (
            <div id="inventory-empty" className="text-center py-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card inline-block px-12 py-10 border border-cyan-500/20"
                >
                    <div className="text-6xl mb-4">🔒</div>
                    <h3 className="text-xl font-bold text-white mb-2">Wallet Not Connected</h3>
                    <p className="text-slate-400">Connect your wallet to view your NFT inventory.</p>
                </motion.div>
            </div>
        );
    }

    const items = (data?.data ?? []) as GameItemObject[];

    const filteredItems = filter === 'All'
        ? items
        : items.filter(item => {
            const rarityNum = item.data.content?.fields?.rarity;
            return RARITY_NUM_MAP[typeof rarityNum === 'number' ? rarityNum : 0] === filter;
        });

    const rarityFilters: Array<Rarity | 'All'> = ['All', 'Common', 'Rare', 'Epic', 'Legendary'];

    return (
        <div id="inventory-view">
            {/* Header */}
            <motion.div
                className="text-center mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h2
                    className="text-4xl font-extrabold mb-3"
                    style={{ background: 'linear-gradient(90deg, #22d3ee, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                >
                    My Inventory
                </h2>
                <p className="text-slate-400">
                    {isLoading ? 'Loading…' : `${items.length} GameItem${items.length !== 1 ? 's' : ''} collected`}
                </p>
            </motion.div>

            {/* Rarity filter tabs */}
            {!isLoading && items.length > 0 && (
                <motion.div
                    className="flex flex-wrap gap-2 justify-center mb-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    {rarityFilters.map(r => {
                        const cfg = r !== 'All' ? RARITY_CONFIG[r] : null;
                        return (
                            <button
                                key={r}
                                id={`filter-${r.toLowerCase()}`}
                                onClick={() => setFilter(r)}
                                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${filter === r ? 'text-white' : 'text-slate-400 hover:text-white'
                                    }`}
                                style={filter === r && cfg
                                    ? { background: `${cfg.color}33`, border: `1px solid ${cfg.color}88`, boxShadow: cfg.glow, color: cfg.color }
                                    : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }
                                }
                            >
                                {r}
                            </button>
                        );
                    })}
                </motion.div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="flex justify-center items-center py-20 gap-3">
                    <svg className="animate-spin h-8 w-8 text-cyan-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span className="text-slate-400 text-lg">Loading inventory…</span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="text-center py-10 text-red-400 font-semibold">
                    ❌ Failed to load inventory: {String(error)}
                </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && items.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-20"
                >
                    <div className="glass-card inline-block px-12 py-10 border border-cyan-500/20">
                        <div className="text-6xl mb-4">⚔️</div>
                        <h3 className="text-xl font-bold text-white mb-2">No Items Yet</h3>
                        <p className="text-slate-400">Open some loot boxes to collect GameItem NFTs!</p>
                    </div>
                </motion.div>
            )}

            {/* Item grid */}
            {!isLoading && filteredItems.length > 0 && (
                <motion.div
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                    layout
                >
                    {filteredItems.map((item, idx) => (
                        <ItemCard key={item.data.objectId} item={item} idx={idx} />
                    ))}
                </motion.div>
            )}

            {/* No results for filter */}
            {!isLoading && items.length > 0 && filteredItems.length === 0 && (
                <div className="text-center py-10 text-slate-500">
                    No {filter} items in your inventory.
                </div>
            )}
        </div>
    );
}
