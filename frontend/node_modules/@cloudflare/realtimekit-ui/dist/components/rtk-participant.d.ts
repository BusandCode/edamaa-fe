import type { Components, JSX } from "../types/components";

interface RtkParticipant extends Components.RtkParticipant, HTMLElement {}
export const RtkParticipant: {
    prototype: RtkParticipant;
    new (): RtkParticipant;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
