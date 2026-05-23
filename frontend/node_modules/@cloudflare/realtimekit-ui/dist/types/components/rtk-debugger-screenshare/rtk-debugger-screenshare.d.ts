import { States, Size, IconPack, RtkI18n } from '../../exports';
import { Meeting } from '../../types/rtk-client';
import { VideoProducerScoreStats, AudioProducerScoreStats } from '@cloudflare/realtimekit';
import { FormattedStatsObj, StatsHealth } from '../../utils/debugger-utils';
export declare class RtkDebuggerScreenShare {
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
    /** Stats as formatted array to display */
    audioProducerFormattedStats: FormattedStatsObj[];
    /** Last raw video score stats obj */
    audioProducerScoreStats: AudioProducerScoreStats;
    /** Summarised health of network stats */
    networkBasedMediaHealth: StatsHealth;
    private mediaScoreUpdateListener;
    private screenShareUpdateListener;
    videoProducerScoreStatsChanged(newVideoProducerScoreStats: VideoProducerScoreStats): Promise<void>;
    audioProducerScoreStatsChanged(newAudioProducerScoreStats: AudioProducerScoreStats): Promise<void>;
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): Promise<void>;
    render(): any;
}
