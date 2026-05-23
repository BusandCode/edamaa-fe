import type { Components, JSX } from "../types/components";

interface RtkAudioTile extends Components.RtkAudioTile, HTMLElement {}
export const RtkAudioTile: {
    prototype: RtkAudioTile;
    new (): RtkAudioTile;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
