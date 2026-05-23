import type { Components, JSX } from "../types/components";

interface RtkStage extends Components.RtkStage, HTMLElement {}
export const RtkStage: {
    prototype: RtkStage;
    new (): RtkStage;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
