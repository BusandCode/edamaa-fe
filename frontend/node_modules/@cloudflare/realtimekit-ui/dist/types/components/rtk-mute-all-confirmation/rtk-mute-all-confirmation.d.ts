import { EventEmitter } from '../../stencil-public-runtime';
import { Meeting } from '../../types/rtk-client';
import { States } from '../../types/props';
import { RtkI18n } from '../../lib/lang';
import { IconPack } from '../../lib/icons';
export declare class RtkMuteAllConfirmation {
    /** Meeting object */
    meeting: Meeting;
    /** States object */
    states: States;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    allowUnmute: boolean;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    private onClose;
    private onMuteAll;
    render(): any;
}
