import type { Components, JSX } from "../types/components";

interface RtkFilePickerButton extends Components.RtkFilePickerButton, HTMLElement {}
export const RtkFilePickerButton: {
    prototype: RtkFilePickerButton;
    new (): RtkFilePickerButton;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
