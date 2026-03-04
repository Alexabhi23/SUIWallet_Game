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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {BOX_TIERS.map((tier, idx) => (
                    <motion.div
                        key={tier.id}
                        id={`box-tier-${tier.id}`}
                        className={`glass-card p-6 flex flex-col gap-5 border ${tier.borderClass} ${tier.glowClass} group hover:scale-[1.02] transition-transform duration-300`}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                    >
                        {/* Box visual */}
                        <div className="flex justify-center">
                            <motion.div
                                className="w-28 h-28 rounded-2xl flex items-center justify-center text-6xl relative"
                                style={{ background: `linear-gradient(135deg, ${tier.accentColor}22, ${tier.accentColor}11)`, boxShadow: `0 0 30px ${tier.accentColor}44` }}
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.3 }}
                            >
                                🎁
                                <div className="absolute inset-0 rounded-2xl shimmer-bg" />
                            </motion.div>
                        </div>

                        {/* Info */}
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                            <p className="text-3xl font-extrabold mt-1" style={{ color: tier.accentColor }}>{tier.price}</p>
                        </div>

                        {/* Odds table */}
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Drop Rates</p>
                            {tier.odds.map(odd => (
                                <div key={odd.label} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: odd.color, boxShadow: `0 0 6px ${odd.color}` }} />
                                        <span className="text-sm text-slate-300">{odd.label}</span>
                                    </div>
                                    <span className="text-sm font-semibold font-mono" style={{ color: odd.color }}>{odd.chance}</span>
                                </div>
                            ))}
                        </div>

                        {/* Buy button */}
                        <button
                            id={`buy-btn-${tier.id}`}
                            disabled={!account || isPending || buyingTier === tier.id}
                            onClick={() => handleBuy(tier)}
                            className="w-full py-3 rounded-xl font-bold text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden"
                            style={{
                                background: `linear-gradient(135deg, ${tier.accentColor}cc, ${tier.accentColor}88)`,
                                boxShadow: `0 0 20px ${tier.accentColor}55`,
                            }}
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
                    </motion.div>
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
