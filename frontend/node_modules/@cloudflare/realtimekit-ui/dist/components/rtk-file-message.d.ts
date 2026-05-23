import type { Components, JSX } from "../types/components";

interface RtkFileMessage extends Components.RtkFileMessage, HTMLElement {}
export const RtkFileMessage: {
    prototype: RtkFileMessage;
    new (): RtkFileMessage;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
