import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { motion } from 'framer-motion';
import { BOX_TIERS, BoxTier, LOOT_BOX_MODULE, GAME_CONFIG_ID } from '../constants';


export default function StoreView() {
    const account = useCurrentAccount();
    const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
    const [buyingTier, setBuyingTier] = useState<string | null>(null);
    const [txResult, setTxResult] = useState<{ success: boolean; digest?: string } | null>(null);

    const handleBuy = (tier: BoxTier) => {
        if (!account) return;
        setBuyingTier(tier.id);
        setTxResult(null);

        const tx = new Transaction();
        const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(tier.priceInMist)]);
        tx.moveCall({
            target: `${LOOT_BOX_MODULE}::purchase_loot_box`,
            arguments: [
                tx.object(GAME_CONFIG_ID),
                coin,
            ],
        });

        signAndExecute(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { transaction: tx as any },
            {
                onSuccess: (result) => {
                    setTxResult({ success: true, digest: result.digest });
                    setBuyingTier(null);
                },
                onError: (err) => {
                    console.error('Purchase failed:', err);
                    setTxResult({ success: false });
                    setBuyingTier(null);
                },
            }
        );
    };

    return (
        <div id="store-view">
            {/* Section header */}
            <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <h2 className="text-4xl font-extrabold mb-3"
                    style={{ background: 'linear-gradient(90deg, #c084fc, #22d3ee, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Loot Box Store
                </h2>
                <p className="text-slate-400 text-lg">Open boxes to discover rare GameItem NFTs • Powered by on-chain randomness</p>
            </motion.div>

            {/* Transaction feedback */}
            {txResult && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mb-6 p-4 rounded-xl text-center font-semibold ${txResult.success
                        ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                        : 'bg-red-500/20 border border-red-500/40 text-red-400'
                        }`}
                >
                    {txResult.success ? (
                        <>✅ Box purchased! Tx: <span className="font-mono text-xs">{txResult.digest?.slice(0, 20)}…</span></>
                    ) : (
                        '❌ Purchase failed. Make sure your wallet is connected and has enough SUI.'
                    )}
                </motion.div>
            )}

            {/* Wallet not connected */}
            {!account && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-8 p-4 rounded-xl text-center text-yellow-400 font-medium"
                    style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}
                >
                    ⚠️ Connect your wallet to purchase loot boxes
                </motion.div>
            )}

            {/* Box tier cards */}
            <div className="w-full max-w-4xl bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 mb-12 flex items-center justify-center gap-3 text-yellow-400 font-semibold shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                <span className="text-xl">⚠️</span>
                Connect your wallet to access the store
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
                {BOX_TIERS.map((tier) => (
                    <div
                        key={tier.id}
                        className="relative group rounded-3xl p-[1px] bg-gradient-to-b from-space-700 to-space-800 hover:from-neon-cyan/50 hover:to-neon-purple/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(147,51,234,0.3)] overflow-hidden"
                    >
                        {/* Inner Card */}
                        <div className="relative h-full bg-space-900/90 backdrop-blur-xl rounded-[23px] p-8 flex flex-col z-10">

                            {/* Animated Image Container */}
                            <div className="flex justify-center mb-8 relative">
                                <div className="absolute inset-0 bg-neon-purple/20 blur-3xl rounded-full group-hover:bg-neon-cyan/30 transition-colors duration-500"></div>
                                <motion.img
                                    src="/loot_box_hero.png"
                                    alt="Loot Box"
                                    className="w-48 h-48 object-contain drop-shadow-[0_0_20px_rgba(147,51,234,0.5)] cursor-pointer"
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                />
                            </div>

                            <h2 className="text-2xl font-bold text-center mb-2">{tier.name}</h2>
                            <div className="text-center mb-8">
                                <span className={`text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r ${tier.color}`}>
                                    {tier.price} SUI
                                </span>
                            </div>

                            <div className="mb-8 flex-1">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="w-full h-[1px] bg-space-700"></span>
                                    CHANCES
                                    <span className="w-full h-[1px] bg-space-700"></span>
                                </h3>

                                {/* Horizontal Stacked Bar */}
                                <div className="h-4 w-full flex rounded-full overflow-hidden mb-6 opacity-90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
                                    <div style={{ width: `${tier.odds.common}%`, backgroundColor: '#cbd5e1' }} title={`Common: ${tier.odds.common}%`}></div>
                                    <div style={{ width: `${tier.odds.rare}%`, backgroundColor: '#60a5fa' }} title={`Rare: ${tier.odds.rare}%`}></div>
                                    <div style={{ width: `${tier.odds.epic}%`, backgroundColor: '#c084fc' }} title={`Epic: ${tier.odds.epic}%`}></div>
                                    <div style={{ width: `${tier.odds.legendary}%`, backgroundColor: '#facc15' }} title={`Legendary: ${tier.odds.legendary}%`}></div>
                                </div>

                                {/* Legend */}
                                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-slate-300 shadow-[0_0_8px_rgba(203,213,225,0.6)]"></div>
                                        <span className="text-slate-300">Common</span>
                                        <span className="ml-auto font-mono text-gray-400">{tier.odds.common}%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]"></div>
                                        <span className="text-blue-400">Rare</span>
                                        <span className="ml-auto font-mono text-gray-400">{tier.odds.rare}%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]"></div>
                                        <span className="text-purple-400">Epic</span>
                                        <span className="ml-auto font-mono text-gray-400">{tier.odds.epic}%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]"></div>
                                        <span className="text-yellow-400">Legendary</span>
                                        <span className="ml-auto font-mono text-gray-400">{tier.odds.legendary}%</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                id={`buy-btn-${tier.id}`}
                                disabled={!account || isPending || buyingTier === tier.id}
                                onClick={() => handleBuy(tier)}
                                className="w-full py-3 rounded-xl font-bold text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden
                                    bg-gradient-to-r from-neon-cyan to-neon-purple hover:from-neon-cyan/80 hover:to-neon-purple/80
                                    shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)]"
                            >
                                {buyingTier === tier.id ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Purchasing…
                                    </span>
                                ) : (
                                    `Buy Box — ${tier.price}`
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Info section */}
            <motion.div
                className="mt-12 glass-card p-6 border border-cyan-500/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                <h3 className="text-lg font-bold text-cyan-400 mb-3">ℹ️ How It Works</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-400">
                    <div className="flex flex-col gap-1">
                        <span className="text-white font-semibold">1. Buy a Box</span>
                        <span>Purchase any loot box tier from the store using SUI tokens.</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-white font-semibold">2. Open It</span>
                        <span>Head to "My Boxes" and open your box to reveal your NFT using on-chain randomness.</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-white font-semibold">3. Collect</span>
                        <span>Your GameItem NFT is minted to your wallet. View it in your Inventory.</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
