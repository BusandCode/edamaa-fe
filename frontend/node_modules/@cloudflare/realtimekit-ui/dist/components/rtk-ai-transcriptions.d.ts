import type { Components, JSX } from "../types/components";

interface RtkAiTranscriptions extends Components.RtkAiTranscriptions, HTMLElement {}
export const RtkAiTranscriptions: {
    prototype: RtkAiTranscriptions;
    new (): RtkAiTranscriptions;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
