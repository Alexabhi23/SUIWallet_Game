import { useState } from 'react';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
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

function ItemCard({ item }: { item: GameItemObject }) {
    const fields = item.data.content?.fields ?? {};
    const rarityNum = typeof fields.rarity === 'number' ? fields.rarity : 0;
    const rarity: Rarity = RARITY_NUM_MAP[rarityNum] ?? 'Common';
    const powerLevel = typeof fields.power_level === 'number' ? fields.power_level : 0;
    const name = typeof fields.name === 'string' ? fields.name : `${rarity} Item`;
    const objectId = item.data.objectId;

    return (
        <div style={{ border: '1px solid black', padding: '10px', margin: '10px' }}>
            <p><strong>{name}</strong></p>
            <p>ID: {objectId}</p>
            <p>Power Level: {powerLevel}</p>
            <RarityBadge rarity={rarity} size="sm" />
        </div>
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
        return <p>Wallet Not Connected</p>;
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
        <div>
            <h2>My Inventory</h2>
            <p>{isLoading ? 'Loading...' : `${items.length} items found`}</p>

            <div>
                {rarityFilters.map(r => (
                    <button
                        key={r}
                        onClick={() => setFilter(r)}
                        style={{ fontWeight: filter === r ? 'bold' : 'normal', marginRight: '5px' }}
                    >
                        {r}
                    </button>
                ))}
            </div>

            {isLoading && <p>Loading...</p>}
            {error && <p>Error: {String(error)}</p>}
            {!isLoading && !error && items.length === 0 && <p>No items found.</p>}

            <div>
                {filteredItems.map(item => (
                    <ItemCard key={item.data.objectId} item={item} />
                ))}
            </div>
        </div>
    );
}
