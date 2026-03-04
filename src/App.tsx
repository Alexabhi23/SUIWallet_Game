import { useState } from 'react';
import Header from './components/Header';
import StoreView from './components/StoreView';
import UnOpenedBoxes from './components/UnOpenedBoxes';
import InventoryView from './components/InventoryView';

type Tab = 'store' | 'boxes' | 'inventory';

const TABS: { id: Tab; label: string }[] = [
    { id: 'store', label: 'Store' },
    { id: 'boxes', label: 'My Boxes' },
    { id: 'inventory', label: 'Inventory' },
];

export default function App() {
    const [activeTab, setActiveTab] = useState<Tab>('store');

    return (
        <div>
            <Header />

            <nav>
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        style={{ fontWeight: activeTab === tab.id ? 'bold' : 'normal', marginRight: '10px' }}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>

            <main>
                {activeTab === 'store' && <StoreView />}
                {activeTab === 'boxes' && <UnOpenedBoxes />}
                {activeTab === 'inventory' && <InventoryView />}
            </main>

            <footer>
                <p>Powered by Sui Blockchain — SUI Loot Box v1.0</p>
            </footer>
        </div>
    );
}
