import type { Components, JSX } from "../types/components";

interface RtkFileDropzone extends Components.RtkFileDropzone, HTMLElement {}
export const RtkFileDropzone: {
    prototype: RtkFileDropzone;
    new (): RtkFileDropzone;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
