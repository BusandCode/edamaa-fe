import type { Components, JSX } from "../types/components";

interface RtkLeaveButton extends Components.RtkLeaveButton, HTMLElement {}
export const RtkLeaveButton: {
    prototype: RtkLeaveButton;
    new (): RtkLeaveButton;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
