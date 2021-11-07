import React, { useState, useEffect, useContext } from 'react';
import {
    Button, Drawer, message, Popconfirm, Spin, Table, Tooltip,
} from 'antd';
import {
    DeleteOutlined, QuestionCircleOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { ColumnsType, TablePaginationConfig } from 'antd/lib/table';
import { ColumnType, TableCurrentDataSource } from 'antd/lib/table/interface';
import Link from 'next/link';
import { deleteReplay, FileResponse } from '../../lib/api/apiRequests';
import { getRaceTimeStr, timeDifference } from '../../lib/utils/time';
import { AuthContext } from '../../lib/contexts/AuthContext';

interface ExtendedFileResponse extends FileResponse {
    readableTime: string;
    relativeDate: string;
    finished: boolean;
}

interface Props {
    mapUId: string;
    replays: FileResponse[];
    loadingReplays: boolean;
    onLoadReplay: (replay: FileResponse) => void;
    onRemoveReplay: (replay: FileResponse) => void;
    onLoadAllVisibleReplays: (replays: FileResponse[], selectedReplayDataIds: string[]) => void;
    onRemoveAllReplays: (replays: FileResponse[]) => void;
    onRefreshReplays: () => Promise<void>;
    selectedReplayDataIds: string[];
}

const SidebarReplays = ({
    mapUId,
    replays,
    loadingReplays,
    onLoadReplay,
    onRemoveReplay,
    onLoadAllVisibleReplays,
    onRemoveAllReplays,
    onRefreshReplays,
    selectedReplayDataIds,
}: Props): JSX.Element => {
    const defaultPageSize = 14;

    const showFinishedColumn = replays.some((replay: FileResponse) => !replay.raceFinished);

    const userProfileUrl = '/users/';

    const [visible, setVisible] = useState(true);
    const [visibleReplays, setVisibleReplays] = useState<FileResponse[]>([]);

    const { user } = useContext(AuthContext);

    useEffect(() => {
        // initialize visible replays with the first page
        const initiallyVisibleReplays = replays.slice(0, defaultPageSize);
        setVisibleReplays(() => addReplayInfo(initiallyVisibleReplays));
    }, [replays]);

    const onClose = () => {
        setVisible(false);
    };

    const toggleSidebar = () => {
        setVisible(!visible);
    };

    const getUniqueFilters = (replayFieldCallback: (replay: FileResponse) => string) => {
        const uniques = Array.from(new Set(replays.map(replayFieldCallback)));
        return uniques.sort().map((val) => ({ text: val, value: val }));
    };

    const deleteReplayFile = async (replay: ExtendedFileResponse) => {
        try {
            await deleteReplay(replay);
            await onRefreshReplays();
            message.success('Replay deleted!');
        } catch (e) {
            message.error('Could not delete replay.');
        }
    };

    let columns: ColumnsType<ExtendedFileResponse> = [
        {
            title: 'Player',
            dataIndex: 'playerName',
            filters: getUniqueFilters((replay) => replay.playerName),
            onFilter: (value, record) => record.playerName === value,
            render: (text, replay) => (
                <Link href={`${userProfileUrl}${replay.webId}`}>
                    <a target="_blank" rel="noreferrer" href={`${userProfileUrl}${replay.webId}`}>
                        {replay.playerName}
                    </a>
                </Link>
            ),
        },
        {
            title: 'Time',
            dataIndex: 'readableTime',
            align: 'right',
            width: 100,
            sorter: (a, b) => a.endRaceTime - b.endRaceTime,
        },
        {
            title: 'Date',
            dataIndex: 'relativeDate',
            align: 'right',
            width: 130,
            sorter: (a, b) => a.date - b.date,
        },
        {
            title: 'Finished',
            dataIndex: 'finished',
            align: 'center',
            width: 120,
            filters: [
                { text: 'Yes', value: true },
                { text: 'No', value: false },
            ],
            onFilter: (value, record) => record.finished === value,
            filterMultiple: false,
            render: (_, replay) => (
                <>
                    {replay.finished ? (
                        <div className="text-green-500">Yes</div>
                    ) : (
                        <div className="text-red-500">No</div>
                    )}
                </>
            ),
        },
        {
            title: '',
            key: 'load',
            align: 'center',
            width: 180,
            render: (_, replay) => {
                const selected = selectedReplayDataIds.indexOf(replay._id) !== -1;
                return (
                    <div className="flex flex-row gap-4 items-center">
                        {!selected ? (
                            <Button
                                size="middle"
                                type="primary"
                                onClick={() => onLoadReplay(replay)}
                                className="w-full"
                            >
                                Load
                            </Button>
                        ) : (
                            <Button
                                size="middle"
                                type="primary"
                                danger
                                className="w-full"
                                onClick={() => onRemoveReplay(replay)}
                            >
                                Remove
                            </Button>
                        )}
                        {user && user.accountId === replay.webId && (
                            <Popconfirm
                                title="Delete this replay?"
                                placement="right"
                                icon={(
                                    <QuestionCircleOutlined
                                        style={{ color: '#a61d24' }}
                                    />
                                )}
                                cancelText="No"
                                okText="Yes"
                                okButtonProps={{ danger: true }}
                                onConfirm={() => deleteReplayFile(replay)}
                            >
                                <Button
                                    shape="circle"
                                    danger
                                    icon={<DeleteOutlined style={{ fontSize: '16px', color: '#a61d24' }} />}
                                />
                            </Popconfirm>
                        )}
                    </div>
                );
            },
        },
    ];

    if (!showFinishedColumn) {
        columns = columns.filter((column: ColumnType<ExtendedFileResponse>) => column.dataIndex !== 'finished');
    }

    const addReplayInfo = (replayList: FileResponse[]): ExtendedFileResponse[] => {
        const now = new Date().getTime();

        return replayList.map((replay) => ({
            ...replay,
            key: replay._id,
            readableTime: getRaceTimeStr(replay.endRaceTime),
            relativeDate: timeDifference(now, replay.date),
            finished: replay.raceFinished === 1,
        }));
    };

    const onReplayTableChange = (
        pagination: TablePaginationConfig,
        currentPageData: TableCurrentDataSource<ExtendedFileResponse>,
    ) => {
        const { current, pageSize } = pagination;

        if (current === undefined || pageSize === undefined) {
            return;
        }

        const curPageIndex = current - 1;

        const replaysOnPage = [];
        for (
            let i = curPageIndex * pageSize;
            i < Math.min((curPageIndex + 1) * pageSize, currentPageData.currentDataSource.length);
            i++
        ) {
            replaysOnPage.push(currentPageData.currentDataSource[i]);
        }

        setVisibleReplays(replaysOnPage);
    };

    return (
        <div className="absolute m-8 z-10">
            <Button onClick={toggleSidebar} shape="round" size="large">
                Replay List
            </Button>
            <Drawer
                title="Select replays"
                placement="left"
                width={750}
                onClose={onClose}
                visible={visible}
                className="h-screen"
            >
                <Spin spinning={loadingReplays}>
                    <div className="flex flex-row justify-between items-center mb-4 mx-4">
                        <div className="flex flex-row gap-4">
                            <Button
                                type="primary"
                                onClick={() => onLoadAllVisibleReplays(visibleReplays, selectedReplayDataIds)}
                            >
                                Load all visible
                            </Button>
                            <Button
                                type="primary"
                                danger
                                onClick={() => onRemoveAllReplays(visibleReplays)}
                            >
                                Unload all
                            </Button>
                        </div>
                        <div className="mr-6">
                            <Tooltip title="Refresh">
                                <Button
                                    shape="circle"
                                    size="large"
                                    icon={<ReloadOutlined />}
                                    onClick={onRefreshReplays}
                                />
                            </Tooltip>
                        </div>
                    </div>
                    <div>
                        <Table
                            onChange={(pagination, filters, sorter, currentPageData) => {
                                onReplayTableChange(pagination, currentPageData);
                            }}
                            dataSource={addReplayInfo(replays)}
                            columns={columns}
                            size="small"
                            pagination={{
                                pageSize: defaultPageSize,
                                position: ['bottomCenter'],
                            }}
                            scroll={{ scrollToFirstRowOnChange: true }}
                        />
                    </div>
                </Spin>
            </Drawer>
        </div>
    );
};

export default SidebarReplays;
