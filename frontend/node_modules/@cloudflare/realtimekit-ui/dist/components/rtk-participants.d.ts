import type { Components, JSX } from "../types/components";

interface RtkParticipants extends Components.RtkParticipants, HTMLElement {}
export const RtkParticipants: {
    prototype: RtkParticipants;
    new (): RtkParticipants;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
