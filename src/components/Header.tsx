import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { motion } from 'framer-motion';

export default function Header() {
    const account = useCurrentAccount();

    return (
        <header className="relative z-20 w-full">
            <div className="glass-card rounded-none border-l-0 border-r-0 border-t-0 border-b border-white/10 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    {/* Logo */}
                    <motion.div
                        className="flex items-center gap-3 select-none"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl"
                                style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)', boxShadow: '0 0 20px rgba(124,58,237,0.5)' }}>
                                🎁
                            </div>
                            <div className="absolute -inset-1 rounded-xl opacity-30 blur-sm"
                                style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }} />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight glow-text-purple"
                                style={{ background: 'linear-gradient(90deg, #c084fc, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                SUI LOOT BOX
                            </h1>
                            <p className="text-xs text-slate-500 font-mono">Web3 Gaming on Sui</p>
                        </div>
                    </motion.div>

                    {/* Wallet Info + Connect Button */}
                    <motion.div
                        className="flex items-center gap-4"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {account && (
                            <div className="hidden sm:flex flex-col items-end">
                                <span className="text-xs text-slate-400">Connected</span>
                                <span className="text-xs font-mono text-purple-400">
                                    {account.address.slice(0, 6)}…{account.address.slice(-4)}
                                </span>
                            </div>
                        )}
                        <div id="wallet-connect-button">
                            <ConnectButton />
                        </div>
                    </motion.div>
                </div>
            </div>
        </header>
    );
}
