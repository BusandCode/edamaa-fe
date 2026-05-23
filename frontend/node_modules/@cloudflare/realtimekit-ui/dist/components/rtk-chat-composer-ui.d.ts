import type { Components, JSX } from "../types/components";

interface RtkChatComposerUi extends Components.RtkChatComposerUi, HTMLElement {}
export const RtkChatComposerUi: {
    prototype: RtkChatComposerUi;
    new (): RtkChatComposerUi;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
