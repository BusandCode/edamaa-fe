import type { Components, JSX } from "../types/components";

interface RtkFileMessageView extends Components.RtkFileMessageView, HTMLElement {}
export const RtkFileMessageView: {
    prototype: RtkFileMessageView;
    new (): RtkFileMessageView;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
