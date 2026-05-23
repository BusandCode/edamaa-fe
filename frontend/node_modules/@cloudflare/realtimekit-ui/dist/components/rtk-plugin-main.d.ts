import type { Components, JSX } from "../types/components";

interface RtkPluginMain extends Components.RtkPluginMain, HTMLElement {}
export const RtkPluginMain: {
    prototype: RtkPluginMain;
    new (): RtkPluginMain;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
