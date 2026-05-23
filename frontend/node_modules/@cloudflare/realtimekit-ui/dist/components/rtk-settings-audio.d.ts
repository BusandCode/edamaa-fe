import type { Components, JSX } from "../types/components";

interface RtkSettingsAudio extends Components.RtkSettingsAudio, HTMLElement {}
export const RtkSettingsAudio: {
    prototype: RtkSettingsAudio;
    new (): RtkSettingsAudio;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
