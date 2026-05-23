import { MediaKind } from '@cloudflare/realtimekit';
export type StatsHealth = 'Good' | 'Average' | 'Poor';
export interface FormattedStatsObj {
    name: string;
    value: string;
    description: string;
    verdict: StatsHealth;
}
/** Method to return media health based on the media & network stats */
export declare function getNetworkBasedMediaHealth({ stats, }: {
    kind: MediaKind;
    isScreenshare: boolean;
    stats: FormattedStatsObj[];
}): StatsHealth;
/** Gives verdict based on the packet loss */
export declare function getPacketLossVerdict({ packetLossPercentage, }: {
    packetLossPercentage: number;
}): StatsHealth;
/** Gives verdict based on the jitter */
export declare function getJitterVerdict({ jitterInMS }: {
    jitterInMS: number;
}): StatsHealth;
/** Gives verdict based on the jitter */
export declare function getBitrateVerdict({ bitrate, }: {
    kind: MediaKind;
    isScreenshare: boolean;
    bitrate: number;
}): StatsHealth;
export declare function getOverallBatteryVerdict({ stats }: {
    stats: FormattedStatsObj[];
}): StatsHealth;
export declare function getBatteryLevelVerdict({ batteryLevelPercentage, }: {
    batteryLevelPercentage: number;
}): StatsHealth;
export declare function getBatteryChargingVerdict({ charging, dischargingTimeInSeconds, batteryLevelPercentage, }: {
    charging: boolean;
    chargingTimeInSeconds: number;
    dischargingTimeInSeconds: number;
    batteryLevelPercentage: number;
}): StatsHealth;
