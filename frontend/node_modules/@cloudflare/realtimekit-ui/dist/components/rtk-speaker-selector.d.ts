import type { Components, JSX } from "../types/components";

interface RtkSpeakerSelector extends Components.RtkSpeakerSelector, HTMLElement {}
export const RtkSpeakerSelector: {
    prototype: RtkSpeakerSelector;
    new (): RtkSpeakerSelector;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
