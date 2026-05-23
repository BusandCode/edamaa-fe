import { EventEmitter } from '../../stencil-public-runtime';
import { Meeting } from '../../types/rtk-client';
import { States } from '../../types/props';
import { RtkI18n } from '../../lib/lang';
import { IconPack } from '../../lib/icons';
/**
 * A confirmation modal.
 */
export declare class RtkOverlayModal {
    /** Meeting object */
    meeting: Meeting;
    /** States object */
    states: States;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    connectedCallback(): void;
    render(): any;
}
