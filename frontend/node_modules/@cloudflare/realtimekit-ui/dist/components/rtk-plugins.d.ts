import type { Components, JSX } from "../types/components";

interface RtkPlugins extends Components.RtkPlugins, HTMLElement {}
export const RtkPlugins: {
    prototype: RtkPlugins;
    new (): RtkPlugins;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
