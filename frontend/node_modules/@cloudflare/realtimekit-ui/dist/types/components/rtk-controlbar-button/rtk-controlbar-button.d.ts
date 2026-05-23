import { IconPack } from '../../lib/icons';
import { Size } from '../../types/props';
export type ControlBarVariant = 'button' | 'horizontal';
/**
 * A skeleton component used for composing custom controlbar buttons.
 */
export declare class RtkControlbarButton {
    /** Variant */
    variant: ControlBarVariant;
    /** Whether to show warning icon */
    showWarning: boolean;
    /** Size */
    size: Size;
    /** Label of button */
    label: string;
    /** Icon */
    icon: string;
    /**
     * Loading state
     * Ignores current icon and shows a spinner if true
     */
    isLoading: boolean;
    /** Whether button is disabled */
    disabled: boolean;
    /** Icon pack */
    iconPack: IconPack;
    /** Whether icon requires brand color */
    brandIcon: boolean;
    render(): any;
}
