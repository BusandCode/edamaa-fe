import type { Components, JSX } from "../types/components";

interface RtkDialogManager extends Components.RtkDialogManager, HTMLElement {}
export const RtkDialogManager: {
    prototype: RtkDialogManager;
    new (): RtkDialogManager;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
