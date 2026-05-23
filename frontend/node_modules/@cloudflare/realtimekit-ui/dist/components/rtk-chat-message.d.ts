import type { Components, JSX } from "../types/components";

interface RtkChatMessage extends Components.RtkChatMessage, HTMLElement {}
export const RtkChatMessage: {
    prototype: RtkChatMessage;
    new (): RtkChatMessage;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
