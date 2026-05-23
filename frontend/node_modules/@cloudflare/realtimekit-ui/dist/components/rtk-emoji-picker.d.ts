import type { Components, JSX } from "../types/components";

interface RtkEmojiPicker extends Components.RtkEmojiPicker, HTMLElement {}
export const RtkEmojiPicker: {
    prototype: RtkEmojiPicker;
    new (): RtkEmojiPicker;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
