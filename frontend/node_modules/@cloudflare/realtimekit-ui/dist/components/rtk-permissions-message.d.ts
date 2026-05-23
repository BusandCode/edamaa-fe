import type { Components, JSX } from "../types/components";

interface RtkPermissionsMessage extends Components.RtkPermissionsMessage, HTMLElement {}
export const RtkPermissionsMessage: {
    prototype: RtkPermissionsMessage;
    new (): RtkPermissionsMessage;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
