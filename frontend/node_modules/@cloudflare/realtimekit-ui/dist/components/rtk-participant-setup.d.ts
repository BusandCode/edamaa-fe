import type { Components, JSX } from "../types/components";

interface RtkParticipantSetup extends Components.RtkParticipantSetup, HTMLElement {}
export const RtkParticipantSetup: {
    prototype: RtkParticipantSetup;
    new (): RtkParticipantSetup;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
