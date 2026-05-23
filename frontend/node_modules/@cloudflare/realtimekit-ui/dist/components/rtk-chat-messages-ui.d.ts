import type { Components, JSX } from "../types/components";

interface RtkChatMessagesUi extends Components.RtkChatMessagesUi, HTMLElement {}
export const RtkChatMessagesUi: {
    prototype: RtkChatMessagesUi;
    new (): RtkChatMessagesUi;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
