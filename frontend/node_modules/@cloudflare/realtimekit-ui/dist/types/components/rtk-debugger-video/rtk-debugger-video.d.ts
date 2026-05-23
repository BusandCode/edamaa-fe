import { States, Size, IconPack, RtkI18n } from '../../exports';
import { Meeting } from '../../types/rtk-client';
import { VideoProducerScoreStats } from '@cloudflare/realtimekit';
import { FormattedStatsObj, StatsHealth } from '../../utils/debugger-utils';
export declare class RtkDebuggerVideo {
    /** Meeting object */
    meeting: Meeting;
    /** States object */
    states: States;
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Is Network section expanded */
    isNetworkOpen: boolean;
    /** Is Devices section expanded */
    isDevicesOpen: boolean;
    /** Stats as formatted array to display */
    videoProducerFormattedStats: FormattedStatsObj[];
    /** Last raw video score stats obj */
    videoProducerScoreStats: VideoProducerScoreStats;
    /** Summarised health of network stats */
    networkBasedMediaHealth: StatsHealth;
    /** Summarised health of devices */
    devicesHealth: StatsHealth;
    private mediaScoreUpdateListener;
    private deviceListUpdateListener;
    private videoUpdateListener;
    videoProducerScoreStatsChanged(newVideoProducerScoreStats: VideoProducerScoreStats): Promise<void>;
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): Promise<void>;
    render(): any;
}
