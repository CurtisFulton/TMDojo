import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Layout, Input, Table, Tooltip, Button,
} from 'antd';
import { ColumnsType } from 'antd/lib/table';

import { ReloadOutlined } from '@ant-design/icons';
import { AvailableMap, getAvailableMaps } from '../lib/api/apiRequests';
import InfoCard from '../components/landing/InfoCard';
import { timeDifference } from '../lib/utils/time';

interface ExtendedAvailableMap extends AvailableMap {
    key: string;
}

const Home = (): JSX.Element => {
    const [maps, setMaps] = useState<ExtendedAvailableMap[]>([]);
    const [searchString, setSearchString] = useState<string>('');

    const fetchMaps = async () => {
        const fetchedMaps = await getAvailableMaps(searchString);
        const preparedMaps = fetchedMaps.map((fetchedMap) => ({
            ...fetchedMap,
            key: fetchedMap.mapUId,
        }));
        setMaps(preparedMaps);
    };

    useEffect(() => {
        fetchMaps();
    }, [searchString]);

    const columns: ColumnsType<ExtendedAvailableMap> = [
        {
            title: 'Map name',
            dataIndex: 'mapName',
            render: (_, map) => {
                const mapRef = `/maps/${map.mapUId}`;
                return (
                    <Link href={mapRef}>
                        <a href={mapRef}>{map.mapName}</a>
                    </Link>
                );
            },
            sorter: (a, b) => a.mapName.localeCompare(b.mapName),
            width: '80%',
        },
        {
            title: 'Last updated',
            dataIndex: 'lastUpdate',
            render: (timestamp) => {
                const today = new Date().getTime();
                return <span title={new Date(timestamp).toLocaleString()}>{timeDifference(today, timestamp)}</span>;
            },
            sorter: (a, b) => a.lastUpdate - b.lastUpdate,
            width: '10%',
        },
        {
            title: 'Replays',
            dataIndex: 'count',
            sorter: (a, b) => a.count - b.count,
            defaultSortOrder: 'descend',
            width: '10%',
        },
    ];

    return (
        <Layout>
            <Layout.Content className="w-3/4 m-auto h-full flex flex-col pt-8">
                <InfoCard />
                <div>
                    <div className="flex flex-row items-center my-2 gap-4">
                        <span>Looking for a map?</span>
                        <Tooltip title="Refresh">
                            <Button
                                shape="circle"
                                size="large"
                                icon={<ReloadOutlined />}
                                onClick={fetchMaps}
                            />
                        </Tooltip>
                    </div>
                    <Input.Search
                        placeholder="Enter a map name"
                        onSearch={(searchVal) => setSearchString(searchVal)}
                    />
                    <Table
                        className="dojo-map-search-table"
                        dataSource={maps}
                        columns={columns}
                        size="small"
                        showSorterTooltip={false}
                        pagination={{ defaultPageSize: 10, hideOnSinglePage: true }}
                    />
                </div>
            </Layout.Content>
        </Layout>
    );
};

export default Home;
