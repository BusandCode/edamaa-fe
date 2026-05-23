import type { Components, JSX } from "../types/components";

interface RtkCaptionToggle extends Components.RtkCaptionToggle, HTMLElement {}
export const RtkCaptionToggle: {
    prototype: RtkCaptionToggle;
    new (): RtkCaptionToggle;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
