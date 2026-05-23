import type { Components, JSX } from "../types/components";

interface RtkTranscript extends Components.RtkTranscript, HTMLElement {}
export const RtkTranscript: {
    prototype: RtkTranscript;
    new (): RtkTranscript;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
