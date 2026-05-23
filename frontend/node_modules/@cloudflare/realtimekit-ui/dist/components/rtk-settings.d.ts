import type { Components, JSX } from "../types/components";

interface RtkSettings extends Components.RtkSettings, HTMLElement {}
export const RtkSettings: {
    prototype: RtkSettings;
    new (): RtkSettings;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
