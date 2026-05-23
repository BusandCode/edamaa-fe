import { IconPack, UIConfig } from '../../exports';
import { RtkI18n } from '../../lib/lang';
import { Meeting } from '../../types/rtk-client';
import { Size, States } from '../../types/props';
/**
 * A component that houses all the header components.
 *
 * @slot - Default slot
 */
export declare class RtkHeader {
    /** Variant */
    variant: 'solid' | 'boxed';
    /** Whether to render the default UI */
    disableRender: boolean;
    /** Meeting */
    meeting: Meeting;
    /** Config */
    config: UIConfig;
    /** States */
    states: States;
    /** Icon Pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Size */
    size: Size;
    render(): any;
}
