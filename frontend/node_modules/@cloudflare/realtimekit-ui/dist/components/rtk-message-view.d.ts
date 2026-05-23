import type { Components, JSX } from "../types/components";

interface RtkMessageView extends Components.RtkMessageView, HTMLElement {}
export const RtkMessageView: {
    prototype: RtkMessageView;
    new (): RtkMessageView;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
