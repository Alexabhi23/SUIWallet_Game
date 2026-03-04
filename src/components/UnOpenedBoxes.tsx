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
                    className="glass-card inline-block px-12 py-10 border border-purple-500/20"
                >
                    <div className="text-6xl mb-4">🔒</div>
                    <h3 className="text-xl font-bold text-white mb-2">Wallet Not Connected</h3>
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
                <h2 className="text-4xl font-extrabold mb-3"
                    style={{ background: 'linear-gradient(90deg, #c084fc, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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
                    <div className="glass-card inline-block px-12 py-10 border border-purple-500/20">
                        <div className="text-6xl mb-4 animate-bounce">📦</div>
                        <h3 className="text-xl font-bold text-white mb-2">No Unopened Boxes</h3>
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
                                    className="glass-card p-4 flex flex-col items-center gap-3 border hover:border-purple-400/60 transition-all duration-300"
                                    style={{ borderColor: `${tierColor}44` }}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: tierColor }}>
                                        {tierName}
                                    </p>
                                    <OpeningAnimation
                                        lootBoxObjectId={objectId}
                                        onOpened={handleBoxOpened}
                                    />
                                    <p className="text-xs font-mono text-slate-600 truncate w-full text-center">
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
