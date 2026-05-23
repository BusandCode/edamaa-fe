import type { Components, JSX } from "../types/components";

interface RtkChatSelectorUi extends Components.RtkChatSelectorUi, HTMLElement {}
export const RtkChatSelectorUi: {
    prototype: RtkChatSelectorUi;
    new (): RtkChatSelectorUi;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
