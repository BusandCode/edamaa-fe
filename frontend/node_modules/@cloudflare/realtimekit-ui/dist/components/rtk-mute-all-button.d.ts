import type { Components, JSX } from "../types/components";

interface RtkMuteAllButton extends Components.RtkMuteAllButton, HTMLElement {}
export const RtkMuteAllButton: {
    prototype: RtkMuteAllButton;
    new (): RtkMuteAllButton;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
