import type { Components, JSX } from "../types/components";

interface RtkViewerCount extends Components.RtkViewerCount, HTMLElement {}
export const RtkViewerCount: {
    prototype: RtkViewerCount;
    new (): RtkViewerCount;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
