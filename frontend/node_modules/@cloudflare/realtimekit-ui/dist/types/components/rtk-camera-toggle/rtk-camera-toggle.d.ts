import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Meeting, MediaPermission } from '../../types/rtk-client';
import { Size, States } from '../../types/props';
import { ControlBarVariant } from '../rtk-controlbar-button/rtk-controlbar-button';
import { StageStatus } from '@cloudflare/realtimekit';
/**
 * A button which toggles your camera.
 */
export declare class RtkCameraToggle {
    private videoUpdateListener;
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
    videoEnabled: boolean;
    canProduceVideo: boolean;
    cameraPermission: MediaPermission;
    stageStatus: StageStatus;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    private hasPermissionError;
    private toggleCamera;
    private getState;
    render(): any;
}
