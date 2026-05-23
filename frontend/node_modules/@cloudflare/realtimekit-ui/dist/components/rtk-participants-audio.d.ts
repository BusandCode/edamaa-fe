import type { Components, JSX } from "../types/components";

interface RtkParticipantsAudio extends Components.RtkParticipantsAudio, HTMLElement {}
export const RtkParticipantsAudio: {
    prototype: RtkParticipantsAudio;
    new (): RtkParticipantsAudio;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
