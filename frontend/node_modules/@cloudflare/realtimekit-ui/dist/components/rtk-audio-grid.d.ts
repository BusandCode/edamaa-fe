import type { Components, JSX } from "../types/components";

interface RtkAudioGrid extends Components.RtkAudioGrid, HTMLElement {}
export const RtkAudioGrid: {
    prototype: RtkAudioGrid;
    new (): RtkAudioGrid;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
