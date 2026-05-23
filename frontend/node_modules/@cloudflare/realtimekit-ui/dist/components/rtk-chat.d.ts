import type { Components, JSX } from "../types/components";

interface RtkChat extends Components.RtkChat, HTMLElement {}
export const RtkChat: {
    prototype: RtkChat;
    new (): RtkChat;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
