import type { Components, JSX } from "../types/components";

interface RtkAvatar extends Components.RtkAvatar, HTMLElement {}
export const RtkAvatar: {
    prototype: RtkAvatar;
    new (): RtkAvatar;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
