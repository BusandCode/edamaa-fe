import type { Components, JSX } from "../types/components";

interface RtkWaitingScreen extends Components.RtkWaitingScreen, HTMLElement {}
export const RtkWaitingScreen: {
    prototype: RtkWaitingScreen;
    new (): RtkWaitingScreen;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
