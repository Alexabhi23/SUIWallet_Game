import { useState } from 'react';
import Header from './components/Header';
import StoreView from './components/StoreView';
import UnOpenedBoxes from './components/UnOpenedBoxes';
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
        <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #080818 0%, #0d0d2b 50%, #0a0a20 100%)' }}>
            {/* Background orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', filter: 'blur(60px)' }} />
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15"
                    style={{ background: 'radial-gradient(circle, #0891b2 0%, transparent 70%)', filter: 'blur(60px)' }} />
                <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full opacity-10"
                    style={{ background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)', filter: 'blur(80px)' }} />
            </div>

            <Header />

            {/* Tab navigation */}
            <div className="relative z-10 flex justify-center mt-6 px-4">
                <nav className="glass-card flex gap-1 p-1.5" role="tablist">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            id={`tab-${tab.id}`}
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300
                ${activeTab === tab.id
                                    ? 'bg-gradient-to-r from-purple-600/80 to-cyan-600/60 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }
              `}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 py-8">
                {activeTab === 'store' && <StoreView />}
                {activeTab === 'boxes' && <UnOpenedBoxes />}
                {activeTab === 'inventory' && <InventoryView />}
            </main>

            <footer className="relative z-10 text-center py-6 text-slate-600 text-sm">
                ⚡ Powered by Sui Blockchain — SUI Loot Box v1.0
            </footer>
        </div>
    );
}
