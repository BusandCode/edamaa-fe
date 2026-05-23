import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { States, Size } from '../../types/props';
import { EventEmitter } from '../../stencil-public-runtime';
import { ControlBarVariant } from '../rtk-controlbar-button/rtk-controlbar-button';
/**
 * A button which toggles visilibility of the leave confirmation dialog.
 */
export declare class RtkLeaveButton {
    /** Variant */
    variant: ControlBarVariant;
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    private leave;
    render(): any;
}
