import type { Components, JSX } from "../types/components";

interface RtkParticipantTile extends Components.RtkParticipantTile, HTMLElement {}
export const RtkParticipantTile: {
    prototype: RtkParticipantTile;
    new (): RtkParticipantTile;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
