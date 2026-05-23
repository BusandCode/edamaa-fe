import type { Components, JSX } from "../types/components";

interface RtkImageMessageView extends Components.RtkImageMessageView, HTMLElement {}
export const RtkImageMessageView: {
    prototype: RtkImageMessageView;
    new (): RtkImageMessageView;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
