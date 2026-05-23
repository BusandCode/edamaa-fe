import type { Components, JSX } from "../types/components";

interface RtkPluginsToggle extends Components.RtkPluginsToggle, HTMLElement {}
export const RtkPluginsToggle: {
    prototype: RtkPluginsToggle;
    new (): RtkPluginsToggle;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
