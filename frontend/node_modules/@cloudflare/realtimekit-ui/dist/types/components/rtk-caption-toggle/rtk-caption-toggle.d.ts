import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack, Size, States, UIConfig } from '../../exports';
import { RtkI18n } from '../../lib/lang';
import { Meeting } from '../../types/rtk-client';
import { ControlBarVariant } from '../rtk-controlbar-button/rtk-controlbar-button';
export declare class RtkCaptionToggle {
    /** Variant */
    variant: ControlBarVariant;
    /** Meeting object */
    meeting: Meeting;
    /** States object */
    states: States;
    /** Config */
    config: UIConfig;
    /** Icon pack */
    iconPack: IconPack;
    /** Size */
    size: Size;
    /** Language */
    t: RtkI18n;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    captionEnabled: boolean;
    connectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    disconnectedCallback(): void;
    private permissionsUpdateListener;
    private toggleCaptions;
    render(): any;
}
