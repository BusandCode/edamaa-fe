import type { Components, JSX } from "../types/components";

interface RtkImageMessage extends Components.RtkImageMessage, HTMLElement {}
export const RtkImageMessage: {
    prototype: RtkImageMessage;
    new (): RtkImageMessage;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
