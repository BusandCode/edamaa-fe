import { EventEmitter } from '../../stencil-public-runtime';
import { Meeting } from '../../types/rtk-client';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Size, States } from '../../types/props';
/**
 * A component which lets to manage your camera devices and your video preferences.
 *
 * Emits `rtkStateUpdate` event with data for toggling mirroring of self video:
 * ```ts
 * {
 *  prefs: {
 *    mirrorVideo: boolean
 *  }
 * }
 * ```
 */
export declare class RtkSettingsVideo {
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
    videoEnabled: boolean;
    /** Emits updated state */
    stateUpdate: EventEmitter<States>;
    componentDidLoad(): void;
    meetingChanged(meeting: Meeting): void;
    disconnectedCallback(): void;
    private onVideoUpdate;
    render(): any;
}
