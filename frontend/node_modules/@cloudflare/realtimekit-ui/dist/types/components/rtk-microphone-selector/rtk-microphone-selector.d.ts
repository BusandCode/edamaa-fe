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
export declare class RtkMicrophoneSelector {
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
    audioinputDevices: MediaDeviceInfo[];
    canProduceAudio: boolean;
    currentDevices: {
        audio: MediaDeviceInfo;
    };
    connectedCallback(): void;
    disconnectedCallback(): void;
    private stageStateListener;
    private deviceListUpdateListener;
    private deviceUpdateListener;
    private mediaPermissionUpdateListener;
    meetingChanged(meeting: Meeting): void;
    private setDevice;
    render(): any;
}
