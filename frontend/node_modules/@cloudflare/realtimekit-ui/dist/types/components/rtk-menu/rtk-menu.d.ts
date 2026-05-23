import { Size } from '../../types/props';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Placement } from '../../types/floating-ui';
/**
 * A menu component.
 *
 * @slot - Default slot where you put the contents that you want inside menu
 * @slot trigger - Slot where you put your trigger element, clicking on which will open the menu
 */
export declare class RtkMenu {
    private triggerEl;
    private menuListEl;
    private clickedThis;
    /** Size */
    size: Size;
    /** Placement of menu */
    placement: Placement;
    /** Offset in px */
    offset: number;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    componentDidLoad(): void;
    disconnectedCallback(): void;
    private handleOutsideClick;
    private update;
    render(): any;
}
