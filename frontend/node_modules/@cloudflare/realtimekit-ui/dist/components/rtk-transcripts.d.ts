import type { Components, JSX } from "../types/components";

interface RtkTranscripts extends Components.RtkTranscripts, HTMLElement {}
export const RtkTranscripts: {
    prototype: RtkTranscripts;
    new (): RtkTranscripts;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
