import type { Components, JSX } from "../types/components";

interface RtkImageViewer extends Components.RtkImageViewer, HTMLElement {}
export const RtkImageViewer: {
    prototype: RtkImageViewer;
    new (): RtkImageViewer;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
