import type { Components, JSX } from "../types/components";

interface RtkIdleScreen extends Components.RtkIdleScreen, HTMLElement {}
export const RtkIdleScreen: {
    prototype: RtkIdleScreen;
    new (): RtkIdleScreen;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
