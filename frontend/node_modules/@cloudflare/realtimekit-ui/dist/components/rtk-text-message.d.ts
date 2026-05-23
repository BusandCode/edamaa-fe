import type { Components, JSX } from "../types/components";

interface RtkTextMessage extends Components.RtkTextMessage, HTMLElement {}
export const RtkTextMessage: {
    prototype: RtkTextMessage;
    new (): RtkTextMessage;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
