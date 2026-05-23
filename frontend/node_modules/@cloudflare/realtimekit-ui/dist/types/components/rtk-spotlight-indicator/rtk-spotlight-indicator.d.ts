import { Meeting } from '../../types/rtk-client';
import { RtkI18n } from '../../lib/lang';
import { IconPack } from '../../lib/icons';
import { Size } from '../../exports';
export declare class RtkSpotlightIndicator {
    /** Meeting object */
    meeting: Meeting;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Size */
    size: Size;
    canSpotlight: boolean;
    isSpotlighted: boolean;
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    private permissionsUpdateListener;
    private updateSpotlightState;
    render(): any;
}
