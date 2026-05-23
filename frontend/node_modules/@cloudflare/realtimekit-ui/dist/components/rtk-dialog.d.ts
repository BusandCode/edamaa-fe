import type { Components, JSX } from "../types/components";

interface RtkDialog extends Components.RtkDialog, HTMLElement {}
export const RtkDialog: {
    prototype: RtkDialog;
    new (): RtkDialog;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
