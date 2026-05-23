import type { Components, JSX } from "../types/components";

interface RtkParticipantCount extends Components.RtkParticipantCount, HTMLElement {}
export const RtkParticipantCount: {
    prototype: RtkParticipantCount;
    new (): RtkParticipantCount;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
