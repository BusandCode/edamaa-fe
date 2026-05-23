import type { Components, JSX } from "../types/components";

interface RtkEmojiPickerButton extends Components.RtkEmojiPickerButton, HTMLElement {}
export const RtkEmojiPickerButton: {
    prototype: RtkEmojiPickerButton;
    new (): RtkEmojiPickerButton;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
