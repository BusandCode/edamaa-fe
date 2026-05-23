import type { Components, JSX } from "../types/components";

interface RtkSettingsToggle extends Components.RtkSettingsToggle, HTMLElement {}
export const RtkSettingsToggle: {
    prototype: RtkSettingsToggle;
    new (): RtkSettingsToggle;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
