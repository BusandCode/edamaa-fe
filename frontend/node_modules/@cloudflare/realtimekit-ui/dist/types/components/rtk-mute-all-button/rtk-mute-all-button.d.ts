import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack, Size, States } from '../../exports';
import { RtkI18n } from '../../lib/lang';
import { Meeting } from '../../types/rtk-client';
import { ControlBarVariant } from '../rtk-controlbar-button/rtk-controlbar-button';
export declare class RtkMuteAllButton {
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
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    canDisable: boolean;
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    private permissionsUpdateListener;
    private onMuteAll;
    render(): any;
}
