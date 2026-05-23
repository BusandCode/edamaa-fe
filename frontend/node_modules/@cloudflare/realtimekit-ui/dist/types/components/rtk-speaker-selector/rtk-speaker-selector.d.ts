import { Meeting } from '../../types/rtk-client';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Size, States } from '../../types/props';
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
export declare class RtkSpeakerSelector {
    private testAudioEl;
    /** Meeting object */
    meeting: Meeting;
    /** States object */
    states: States;
    /** variant */
    variant: 'full' | 'inline';
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    speakerDevices: MediaDeviceInfo[];
    currentDevices: {
        speaker: MediaDeviceInfo;
    };
    connectedCallback(): void;
    disconnectedCallback(): void;
    private deviceListUpdateListener;
    private deviceUpdateListener;
    private mediaPermissionUpdate;
    meetingChanged(meeting: Meeting): void;
    private testAudio;
    private setDevice;
    render(): any;
}
