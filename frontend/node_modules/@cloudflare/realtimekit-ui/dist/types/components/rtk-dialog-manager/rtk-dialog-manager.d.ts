import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Meeting } from '../../types/rtk-client';
import { Size, States } from '../../types/props';
import { UIConfig } from '../../types/ui-config';
/**
 * A component which handles all dialog elements in a component such as:
 *
 * - rtk-settings
 * - rtk-leave-meeting
 * - rtk-permissions-message
 * - rtk-image-viewer
 * - rtk-breakout-rooms-manager
 *
 * This components depends on the values from `states` object.
 */
export declare class RtkDialogManager {
    /** Meeting object */
    meeting: Meeting;
    /** UI Config */
    config: UIConfig;
    /** States object */
    states: States;
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    private updateStoreState;
    private cancelJoinStage;
    private joinStage;
    private stageStatusUpdateListener;
    render(): any;
}
