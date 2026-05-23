import type { Components, JSX } from "../types/components";

interface RtkRecordingIndicator extends Components.RtkRecordingIndicator, HTMLElement {}
export const RtkRecordingIndicator: {
    prototype: RtkRecordingIndicator;
    new (): RtkRecordingIndicator;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
