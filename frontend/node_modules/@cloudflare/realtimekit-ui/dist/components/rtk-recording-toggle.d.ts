import type { Components, JSX } from "../types/components";

interface RtkRecordingToggle extends Components.RtkRecordingToggle, HTMLElement {}
export const RtkRecordingToggle: {
    prototype: RtkRecordingToggle;
    new (): RtkRecordingToggle;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
