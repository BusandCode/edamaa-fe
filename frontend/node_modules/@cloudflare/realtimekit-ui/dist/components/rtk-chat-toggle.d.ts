import type { Components, JSX } from "../types/components";

interface RtkChatToggle extends Components.RtkChatToggle, HTMLElement {}
export const RtkChatToggle: {
    prototype: RtkChatToggle;
    new (): RtkChatToggle;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
