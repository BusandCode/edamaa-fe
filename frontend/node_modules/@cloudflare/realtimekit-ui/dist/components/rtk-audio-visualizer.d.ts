import type { Components, JSX } from "../types/components";

interface RtkAudioVisualizer extends Components.RtkAudioVisualizer, HTMLElement {}
export const RtkAudioVisualizer: {
    prototype: RtkAudioVisualizer;
    new (): RtkAudioVisualizer;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
