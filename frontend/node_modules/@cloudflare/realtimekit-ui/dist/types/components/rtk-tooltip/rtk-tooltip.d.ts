import { EventEmitter } from '../../stencil-public-runtime';
import { Size } from '../../types/props';
import { Placement } from '../../types/floating-ui';
export type TooltipVariant = 'primary' | 'secondary';
export type TooltipKind = 'inline' | 'block';
/**
 * Tooltip component which follows RTK Design System.
 *
 * @slot - Default slot for trigger
 * @slot tooltip - Slot for content inside the tooltip
 */
export declare class RtkMenu {
    private triggerEl;
    private tooltipEl;
    private arrowEl;
    /** Tooltip label */
    label: string;
    /** Tooltip variant */
    variant: TooltipVariant;
    /** Disabled */
    disabled: boolean;
    /** Open */
    open: boolean;
    /** Tooltip kind */
    kind: TooltipKind;
    /** Size */
    size: Size;
    /** Placement of menu */
    placement: Placement;
    /** Delay before showing the tooltip */
    delay: number;
    isInFocus: boolean;
    /** Event handler called when the open state of the tooltip changes. */
    openChange: EventEmitter<boolean>;
    componentDidLoad(): void;
    disconnectedCallback(): void;
    openChanged(open: boolean): void;
    private update;
    private showMenu;
    private hideMenu;
    render(): any;
}
