import type { Components, JSX } from "../types/components";

interface RtkEndedScreen extends Components.RtkEndedScreen, HTMLElement {}
export const RtkEndedScreen: {
    prototype: RtkEndedScreen;
    new (): RtkEndedScreen;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
