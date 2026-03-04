import { useState, useCallback } from 'react';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
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
        return <p>Wallet Not Connected</p>;
    }

    const boxes = (data?.data ?? []) as LootBoxObject[];

    return (
        <div>
            <h2>My Unopened Boxes</h2>
            {isLoading && <p>Loading boxes...</p>}
            {error && <p>Error: {String(error)}</p>}
            {!isLoading && !error && boxes.length === 0 && <p>No unopened boxes found.</p>}

            <div>
                {boxes.map((obj) => (
                    <div key={obj.data.objectId} style={{ border: '1px solid black', margin: '10px', padding: '10px' }}>
                        <p>ID: {obj.data.objectId}</p>
                        <OpeningAnimation
                            lootBoxObjectId={obj.data.objectId}
                            onOpened={handleBoxOpened}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
