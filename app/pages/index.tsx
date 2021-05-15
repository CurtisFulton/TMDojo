import React, { useEffect, useState } from "react";
import { Layout, Input, Table } from "antd";
import { ColumnsType } from "antd/lib/table";

import { AvailableMap, getAvailableMaps } from "../lib/api/apiRequests";

interface ExtendedAvailableMap extends AvailableMap {
    key: string;
}

const Home = (): JSX.Element => {
    const [maps, setMaps] = useState<ExtendedAvailableMap[]>([]);
    const [searchString, setSearchString] = useState<string>("");

    const fetchMaps = async () => {
        const fetchedMaps = await getAvailableMaps(searchString);
        const preparedMaps = fetchedMaps.map((fetchedMap) => {
            return {
                ...fetchedMap,
                key: fetchedMap.mapUId,
            };
        });
        setMaps(preparedMaps);
    };

    useEffect(() => {
        fetchMaps();
    }, [searchString]);

    const columns: ColumnsType<ExtendedAvailableMap> = [
        {
            title: "Map name",
            dataIndex: "mapName",
            render: (_, map) => <a href={`/maps/${map.mapUId}`}>{map.mapName}</a>,
            sorter: (a, b) => a.mapName.localeCompare(b.mapName),
            width: "90%",
        },
        {
            title: "Replays",
            dataIndex: "count",
            sorter: (a, b) => a.count - b.count,
            defaultSortOrder: "descend",
            width: "10%",
        },
    ];

    return (
        <Layout>
            <Layout.Content className="w-3/4 m-auto h-full flex flex-col justify-center">
                <div>
                    Looking for a map?
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
