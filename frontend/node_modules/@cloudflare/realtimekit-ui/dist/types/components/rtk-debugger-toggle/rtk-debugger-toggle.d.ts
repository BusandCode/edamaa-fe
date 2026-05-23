import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Size, States } from '../../types/props';
import { ControlBarVariant } from '../rtk-controlbar-button/rtk-controlbar-button';
import { Meeting } from '../../types/rtk-client';
export declare class RtkDebuggerToggle {
    /** Variant */
    variant: ControlBarVariant;
    /** Meeting object */
    meeting: Meeting;
    /** States object */
    states: States;
    /** Language */
    t: RtkI18n;
    /** Icon pack */
    iconPack: IconPack;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    /** Size */
    size: Size;
    private toggleDebugger;
    render(): any;
}
