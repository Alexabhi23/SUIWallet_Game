import { useState } from 'react';
import Header from './components/Header';
import StoreView from './components/StoreView';
import UnOpenedBoxes from './components/UnOpenedBoxes';
import { motion, AnimatePresence } from 'framer-motion';
import InventoryView from './components/InventoryView';

type Tab = 'store' | 'boxes' | 'inventory';

const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'store', label: 'Store', icon: '🛒' },
    { id: 'boxes', label: 'My Boxes', icon: '📦' },
    { id: 'inventory', label: 'Inventory', icon: '⚔️' },
];

export default function App() {
    const [activeTab, setActiveTab] = useState<Tab>('store');

    return (
        <div className="min-h-screen text-white relative overflow-hidden bg-space-900">
            {/* Dynamic Starfield/Particle Background (CSS based) */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-purpleGlow blur-[120px] rounded-full mix-blend-screen opacity-30 animate-pulse-slow"></div>
                <div className="absolute bottom-[0%] right-[-5%] w-[50%] h-[50%] bg-neon-cyanGlow blur-[150px] rounded-full mix-blend-screen opacity-20"></div>
                {/* Simulated stars */}
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(1px 1px at 20px 30px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 40px 70px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 50px 160px, #ffffff, rgba(0,0,0,0))', backgroundSize: '200px 200px', opacity: 0.15 }}></div>
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
                <Header />

                <main className="flex-1 container mx-auto px-4 py-12 max-w-6xl flex flex-col">

                    {/* Futuristic Pill Tab Navigation */}
                    <div className="flex justify-center mb-16">
                        <div className="flex space-x-2 bg-space-800/80 backdrop-blur-md p-2 rounded-full border border-space-700 shadow-[0_0_30px_rgba(147,51,234,0.1)]">
                            {TABS.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as Tab)}
                                        className={`relative px-8 py-3 rounded-full text-sm font-bold tracking-wide transition-all duration-300 ${isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-space-700/50'}`}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="active-pill"
                                                className="absolute inset-0 bg-gradient-to-r from-neon-purple/80 to-neon-cyan/80 rounded-full"
                                                initial={false}
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                style={{ zIndex: 0 }}
                                            />
                                        )}
                                        <span className="relative z-10 flex items-center space-x-2">
                                            <span>{tab.icon}</span>
                                            <span>{tab.label}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        {activeTab === 'store' && <StoreView />}
                        {activeTab === 'boxes' && <UnOpenedBoxes />}
                        {activeTab === 'inventory' && <InventoryView />}
                    </div>
                </main>

                <footer className="relative z-10 text-center py-6 text-slate-400 text-sm">
                    ⚡ Powered by Sui Blockchain — SUI Loot Box v1.0
                </footer>
            </div>
        </div>
    );
}
