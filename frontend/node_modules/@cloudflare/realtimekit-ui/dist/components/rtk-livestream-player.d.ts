import type { Components, JSX } from "../types/components";

interface RtkLivestreamPlayer extends Components.RtkLivestreamPlayer, HTMLElement {}
export const RtkLivestreamPlayer: {
    prototype: RtkLivestreamPlayer;
    new (): RtkLivestreamPlayer;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
