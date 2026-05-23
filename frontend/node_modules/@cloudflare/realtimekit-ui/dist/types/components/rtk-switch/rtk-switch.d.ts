import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
/**
 * A switch component which follows RTK Design System.
 */
export declare class RtkSwitch {
    /** Whether the switch is enabled/checked */
    checked: boolean;
    /** Whether switch is readonly */
    readonly: boolean;
    /** Whether switch is readonly */
    disabled: boolean;
    /** Event when switch value is changed */
    onChange: EventEmitter<boolean>;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    connectedCallback(): void;
    private onClick;
    private onKeyPress;
    checkedChange(checked: boolean): void;
    render(): any;
}
