import React, {
    useContext, useEffect, useMemo, useState,
} from 'react';
import { useRouter } from 'next/router';
import { Card, Empty, Skeleton } from 'antd';
import { PlaySquareOutlined } from '@ant-design/icons';
import {
    FileResponse, getMapInfo, getReplays, MapInfo,
} from '../../../lib/api/apiRequests';
import HeadTitle from '../../../components/common/HeadTitle';
import { cleanTMFormatting } from '../../../lib/utils/formatting';
import MapHeader from '../../../components/maps/MapHeader';
import ReplayTimesHistogram from '../../../components/mapStats/statistics/ReplayTimesHistogram';
import AggregateMapStats from '../../../components/mapStats/statistics/AggregateMapStats';
import FastestTimeProgression from '../../../components/mapStats/statistics/FastestTimeProgression';
import { AuthContext } from '../../../lib/contexts/AuthContext';
import { MapStatsType, MapStatsTypeSwitcher } from '../../../components/mapStats/common/MapStatsTypeSwitcher';
import Footer from '../../../components/common/Footer';
import CleanButton from '../../../components/common/CleanButton';
import PageContainer from '../../../components/containers/PageContainer';

const MapStats = () => {
    const { user } = useContext(AuthContext);

    const [replays, setReplays] = useState<FileResponse[]>([]);
    const [loadingReplays, setLoadingReplays] = useState<boolean>(true);
    const [mapData, setMapData] = useState<MapInfo>();

    const [mapStatsType, setMapStatsType] = useState(MapStatsType.GLOBAL);

    const router = useRouter();
    const { mapUId } = router.query;

    const fetchAndSetReplays = async () => {
        setLoadingReplays(true);

        const { files } = await getReplays({ mapUId: `${mapUId}` });
        setReplays(files);

        setLoadingReplays(false);
    };

    useEffect(() => {
        const fetchMapData = async (mapId: string) => {
            const mapInfo = await getMapInfo(mapId); // TODO: what happens if the map can't be found?
            setMapData(mapInfo);
        };
        if (mapUId !== undefined) {
            fetchAndSetReplays();
            fetchMapData(`${mapUId}`);
        }
    }, [mapUId]);

    // If user object changes, set the according map stats type
    useEffect(() => {
        if (replays) {
            if (user === undefined) {
                setMapStatsType(MapStatsType.GLOBAL);
            } else {
                const userReplays = replays.filter((r) => r.webId === user.accountId);
                if (userReplays.length > 0) {
                    setMapStatsType(MapStatsType.PERSONAL);
                } else {
                    setMapStatsType(MapStatsType.GLOBAL);
                }
            }
        }
    }, [replays, user]);

    const getTitle = () => (mapData?.name ? `${cleanTMFormatting(mapData.name)} - TMDojo` : 'TMDojo');

    const calcBinSize = (inputReplays: FileResponse[]) => {
        if (inputReplays.length === 0) {
            return undefined;
        }

        const minTime = Math.min(...inputReplays.map((r) => r.endRaceTime));
        const maxTime = Math.max(...inputReplays.map((r) => r.endRaceTime));

        // WIP method for determining bin size using the min and max times
        let binSize = 10 ** (Math.floor(Math.log10(maxTime - minTime)) - 1);
        binSize = Math.max(binSize, 1); // Make sure the bin size is at least 1 millisecond
        return binSize;
    };

    const binSize = useMemo(() => calcBinSize(replays), [replays]);

    const toggleMapStatsType = () => {
        if (mapStatsType === MapStatsType.GLOBAL) {
            setMapStatsType(MapStatsType.PERSONAL);
        } else {
            setMapStatsType(MapStatsType.GLOBAL);
        }
    };

    const allReplaysFilteredByCurrentUser = useMemo(
        () => {
            const finishedReplays = replays.filter((r) => r.raceFinished === 1);

            if (mapStatsType === MapStatsType.GLOBAL || user === undefined) {
                return finishedReplays;
            }

            const filteredReplays = finishedReplays.filter((r) => r.webId === user.accountId);

            return filteredReplays;
        },
        [user, replays, mapStatsType],
    );

    return (
        <div className="flex flex-col items-center min-h-screen bg-page-back">
            <HeadTitle title={getTitle()} />
            <MapHeader
                mapInfo={mapData || {}}
                title="Map statistics"
                backUrl="/"
            >
                <CleanButton
                    url={`/maps/${mapData?.mapUid}`}
                    backColor="hsl(0, 0%, 15%)"
                    disabled={mapData === undefined}
                >
                    <div className="flex gap-2 items-center">
                        <PlaySquareOutlined />
                        3D Viewer
                    </div>
                </CleanButton>
            </MapHeader>

            <PageContainer>
                <div className="w-full mb-8 bg-gray-750 rounded-md p-8">
                    {mapData === undefined
                        ? (
                            <Skeleton loading active title={false} />)
                        : (
                            <MapStatsTypeSwitcher
                                mapStatsType={mapStatsType}
                                mapData={mapData}
                                toggleMapStatsType={toggleMapStatsType}
                            />
                        )}
                </div>
                <div
                    className="w-full p-8 bg-gray-750 rounded-md"
                >
                    <div className="flex flex-col h-full gap-4">
                        {mapData !== undefined && allReplaysFilteredByCurrentUser.length === 0
                            ? (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="No finished replays yet"
                                />
                            ) : (
                                <>
                                    <Card
                                        title="Replays"
                                        type="inner"
                                        className="bg-gray-850"
                                    >
                                        <Skeleton loading={loadingReplays} active title={false}>
                                            <AggregateMapStats replays={allReplaysFilteredByCurrentUser} />
                                        </Skeleton>
                                    </Card>

                                    <Card
                                        title={`Finish Time Histogram ${binSize ? `(${binSize}ms bins)` : ''}`}
                                        type="inner"
                                        className="bg-gray-850"
                                    >
                                        <Skeleton loading={loadingReplays} active>
                                            {binSize && (
                                                <ReplayTimesHistogram
                                                    replays={allReplaysFilteredByCurrentUser}
                                                    binSize={binSize}
                                                />
                                            )}
                                        </Skeleton>
                                    </Card>

                                    <Card
                                        title="Fastest time progression"
                                        type="inner"
                                        className="bg-gray-850"
                                    >
                                        <Skeleton loading={loadingReplays} active>
                                            <FastestTimeProgression
                                                replays={allReplaysFilteredByCurrentUser}
                                                userToShowProgression={user}
                                                onlyShowUserProgression={mapStatsType === MapStatsType.PERSONAL}
                                            />
                                        </Skeleton>
                                    </Card>
                                </>
                            )}
                    </div>
                </div>
            </PageContainer>
            <Footer />
        </div>
    );
};

export default MapStats;
