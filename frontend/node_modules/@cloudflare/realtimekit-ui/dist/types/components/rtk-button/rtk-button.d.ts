import { Size } from '../../types/props';
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonKind = 'button' | 'icon' | 'wide';
/**
 * A button that follows RTK Design System.
 *
 * @slot - Default slot
 * @slot start - Content placed to the start of the button, i.e; left.
 * @slot end - Content placed to the end of the button, i.e; right.
 */
export declare class RtkButton {
    /** Size */
    size: Size;
    /** Button variant */
    variant: ButtonVariant;
    /** Button type */
    kind: ButtonKind;
    /** Whether to reverse order of children */
    reverse: boolean;
    /** Where the button is disabled or not */
    disabled: boolean;
    /** Button type */
    type: HTMLButtonElement['type'];
    render(): any;
}
