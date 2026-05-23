import type { Components, JSX } from "../types/components";

interface RtkScreenshareView extends Components.RtkScreenshareView, HTMLElement {}
export const RtkScreenshareView: {
    prototype: RtkScreenshareView;
    new (): RtkScreenshareView;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
