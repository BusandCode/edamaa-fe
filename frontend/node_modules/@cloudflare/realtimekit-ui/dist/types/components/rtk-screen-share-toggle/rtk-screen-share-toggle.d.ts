import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Meeting, MediaPermission } from '../../types/rtk-client';
import { Size, States } from '../../types/props';
import { EventEmitter } from '../../stencil-public-runtime';
import { ControlBarVariant } from '../rtk-controlbar-button/rtk-controlbar-button';
import { StageStatus } from '@cloudflare/realtimekit';
interface ScreenShareState {
    tooltipLabel: string;
    label: string;
    icon: string;
    classList: {
        [key: string]: boolean;
    };
    showWarning: boolean;
    disable: boolean;
}
/**
 * A button which toggles your screenshare.
 */
export declare class RtkScreenShareToggle {
    /** States object */
    states: States;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    /** Variant */
    variant: ControlBarVariant;
    /** Meeting object */
    meeting: Meeting;
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /**
     * Maximum screen share count (value from preset)
     * -1 denotes there is no limit on maximum
     */
    maxScreenShareCount: number;
    screenShareCount: number;
    screenShareEnabled: boolean;
    canScreenShare: boolean;
    shareScreenPermission: MediaPermission;
    screenShareState: ScreenShareState;
    stageStatus: StageStatus;
    /**
     * Emit api error events
     */
    apiError: EventEmitter<{
        trace: string;
        message: string;
    }>;
    private screenShareListener;
    private participantLeftListener;
    private stageStatusListener;
    private mediaPermissionUpdateListener;
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    private hasPermissionError;
    private reachedMaxScreenShares;
    private toggleScreenShare;
    private getState;
    render(): any;
}
export {};
