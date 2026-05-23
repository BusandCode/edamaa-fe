import { States, Size, IconPack, RtkI18n } from '../../exports';
import { Meeting } from '../../types/rtk-client';
import { AudioProducerScoreStats } from '@cloudflare/realtimekit';
import { FormattedStatsObj, StatsHealth } from '../../utils/debugger-utils';
export declare class RtkDebuggerAudio {
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
    audioProducerFormattedStats: FormattedStatsObj[];
    /** Last raw audio score stats obj */
    audioProducerScoreStats: AudioProducerScoreStats;
    /** Summarised health of network stats */
    networkBasedMediaHealth: StatsHealth;
    /** Summarised health of devices */
    devicesHealth: StatsHealth;
    private mediaScoreUpdateListener;
    private deviceListUpdateListener;
    private audioUpdateListener;
    audioProducerScoreStatsChanged(newAudioProducerScoreStats: AudioProducerScoreStats): Promise<void>;
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): Promise<void>;
    render(): any;
}
