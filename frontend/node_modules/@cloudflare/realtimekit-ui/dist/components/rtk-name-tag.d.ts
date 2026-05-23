import type { Components, JSX } from "../types/components";

interface RtkNameTag extends Components.RtkNameTag, HTMLElement {}
export const RtkNameTag: {
    prototype: RtkNameTag;
    new (): RtkNameTag;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
