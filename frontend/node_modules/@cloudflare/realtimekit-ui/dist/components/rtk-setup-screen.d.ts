import type { Components, JSX } from "../types/components";

interface RtkSetupScreen extends Components.RtkSetupScreen, HTMLElement {}
export const RtkSetupScreen: {
    prototype: RtkSetupScreen;
    new (): RtkSetupScreen;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
