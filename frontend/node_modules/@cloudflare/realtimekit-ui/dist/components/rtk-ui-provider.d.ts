import type { Components, JSX } from "../types/components";

interface RtkUiProvider extends Components.RtkUiProvider, HTMLElement {}
export const RtkUiProvider: {
    prototype: RtkUiProvider;
    new (): RtkUiProvider;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
