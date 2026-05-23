import { States, Size, IconPack, RtkI18n } from '../../exports';
import { Meeting } from '../../types/rtk-client';
import { FormattedStatsObj, StatsHealth } from '../../utils/debugger-utils';
interface BatteryManager extends EventTarget {
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
    level: number;
    onchargingchange: ((this: BatteryManager, event: Event) => any) | null;
    onchargingtimechange: ((this: BatteryManager, event: Event) => any) | null;
    ondischargingtimechange: ((this: BatteryManager, event: Event) => any) | null;
    onlevelchange: ((this: BatteryManager, event: Event) => any) | null;
}
export declare class RtkDebuggerSystem {
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
    isBatterySectionOpen: boolean;
    /** Summarised health of network stats */
    batterySectionHealth: StatsHealth;
    /** Battery manager */
    battery: BatteryManager;
    /** Stats as formatted array to display */
    batteryFormattedStats: FormattedStatsObj[];
    private toggleSection;
    private batteryUpdateListener;
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): Promise<void>;
    render(): any;
}
export {};
