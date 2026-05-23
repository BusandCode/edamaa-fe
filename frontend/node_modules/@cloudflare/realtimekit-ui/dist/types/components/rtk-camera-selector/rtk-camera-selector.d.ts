import { Meeting } from '../../types/rtk-client';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Size } from '../../types/props';
/**
 * A component which lets to manage your audio devices and audio preferences.
 *
 * Emits `rtkStateUpdate` event with data for muting notification sounds:
 * ```ts
 * {
 *  prefs: {
 *    muteNotificationSounds: boolean
 *  }
 * }
 * ```
 */
export declare class RtkCameraSelector {
    /** Meeting object */
    meeting: Meeting;
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    /** variant */
    variant: 'full' | 'inline';
    /** Language */
    t: RtkI18n;
    videoDevices: MediaDeviceInfo[];
    currentDevice: MediaDeviceInfo;
    canProduceVideo: boolean;
    meetingChanged(meeting: Meeting): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private stageStateListener;
    private deviceListUpdateListener;
    private deviceUpdateListener;
    private mediaPermissionUpdateListener;
    private setDevice;
    render(): any;
}
