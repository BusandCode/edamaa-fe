import { EventEmitter } from '../../stencil-public-runtime';
import { Meeting, MediaPermission } from '../../types/rtk-client';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Size, States } from '../../types/props';
import { ControlBarVariant } from '../rtk-controlbar-button/rtk-controlbar-button';
import { StageStatus } from '@cloudflare/realtimekit';
/**
 * A button which toggles your microphone.
 */
export declare class RtkMicToggle {
    private audioUpdateListener;
    private stageStatusListener;
    private mediaPermissionUpdateListener;
    private meetingPermissionsUpdateListener;
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
    audioEnabled: boolean;
    canProduceAudio: boolean;
    micPermission: MediaPermission;
    stageStatus: StageStatus;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    private hasPermissionError;
    private toggleMic;
    private getState;
    render(): any;
}
