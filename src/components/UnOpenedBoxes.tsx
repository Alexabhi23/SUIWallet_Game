import { useState, useCallback } from 'react';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { motion, AnimatePresence } from 'framer-motion';
import { LOOT_BOX_TYPE } from '../constants';
import OpeningAnimation from './OpeningAnimation';

interface LootBoxObject {
    data: {
        objectId: string;
        type?: string;
        content?: {
            dataType: string;
            fields?: Record<string, unknown>;
        };
    };
}

export default function UnOpenedBoxes() {
    const account = useCurrentAccount();
    const [refreshKey, setRefreshKey] = useState(0);

    const { data, isLoading, error, refetch } = useSuiClientQuery(
        'getOwnedObjects',
        {
            owner: account?.address ?? '',
            filter: { StructType: LOOT_BOX_TYPE },
            options: { showContent: true, showType: true },
        },
        { enabled: !!account?.address, queryKey: ['loot-boxes', account?.address, refreshKey] }
    );

    const handleBoxOpened = useCallback(async () => {
        setRefreshKey(k => k + 1);
        await refetch();
    }, [refetch]);

    if (!account) {
        return (
            <div id="unopened-boxes-empty" className="text-center py-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-space-800/80 backdrop-blur-xl inline-block px-12 py-10 border border-neon-purple/30 rounded-3xl shadow-[0_0_40px_rgba(147,51,234,0.15)]"
                >
                    <div className="text-6xl mb-6 drop-shadow-[0_0_15px_rgba(147,51,234,0.5)]">🔒</div>
                    <h3 className="text-2xl font-black text-white mb-3">Wallet Not Connected</h3>
                    <p className="text-slate-400">Connect your wallet to see your unopened loot boxes.</p>
                </motion.div>
            </div>
        );
    }

    const boxes = (data?.data ?? []) as LootBoxObject[];

    return (
        <div id="unopened-boxes-view">
            {/* Header */}
            <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h2 className="text-5xl font-black mb-4 tracking-tight"
                    style={{ background: 'linear-gradient(90deg, #9333ea, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 20px rgba(147,51,234,0.3))' }}>
                    My Unopened Boxes
                </h2>
                <p className="text-slate-400">Click "Open" on any box to reveal your GameItem NFT</p>
            </motion.div>

            {/* Loading */}
            {isLoading && (
                <div className="flex justify-center items-center py-20 gap-3">
                    <svg className="animate-spin h-8 w-8 text-purple-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span className="text-slate-400 text-lg">Loading your boxes…</span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="text-center py-10 text-red-400 font-semibold">
                    ❌ Failed to load boxes: {String(error)}
                </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && boxes.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-20"
                >
                    <div className="bg-space-800/80 backdrop-blur-xl inline-block px-12 py-10 border border-neon-cyan/30 rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.15)]">
                        <div className="flex justify-center mb-6">
                            <img src="/loot_box_hero.png" alt="Empty" className="w-24 h-24 object-contain opacity-50 grayscale" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-3">No Unopened Boxes</h3>
                        <p className="text-slate-400 mb-4">Head to the Store to purchase your first loot box!</p>
                    </div>
                </motion.div>
            )}

            {/* Box grid */}
            <AnimatePresence>
                {!isLoading && boxes.length > 0 && (
                    <motion.div
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ staggerChildren: 0.05 }}
                    >
                        {boxes.map((obj, idx) => {
                            const objectId = obj.data.objectId;
                            const fields = obj.data.content?.fields ?? {};
                            const tierNum = typeof fields.tier === 'number' ? fields.tier : 0;
                            const tierColors = ['#60a5fa', '#a855f7', '#fbbf24'];
                            const tierNames = ['Standard', 'Premium', 'Legendary'];
                            const tierColor = tierColors[tierNum] ?? '#60a5fa';
                            const tierName = tierNames[tierNum] ?? 'Standard';

                            return (
                                <motion.div
                                    key={objectId}
                                    id={`lootbox-card-${objectId.slice(-6)}`}
                                    className="bg-space-800/60 backdrop-blur-md rounded-2xl p-6 flex flex-col items-center gap-4 border transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(147,51,234,0.2)] hover:bg-space-800/80"
                                    style={{ borderColor: `${tierColor}55` }}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ delay: idx * 0.05, type: "spring" }}
                                >
                                    <p className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: tierColor, textShadow: `0 0 10px ${tierColor}88` }}>
                                        {tierName}
                                    </p>
                                    <OpeningAnimation
                                        lootBoxObjectId={objectId}
                                        onOpened={handleBoxOpened}
                                    />
                                    <p className="text-xs font-mono text-slate-500 truncate w-full text-center mt-2 bg-space-900/50 py-1 rounded-md border border-space-700">
                                        {objectId.slice(0, 6)}…{objectId.slice(-4)}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
