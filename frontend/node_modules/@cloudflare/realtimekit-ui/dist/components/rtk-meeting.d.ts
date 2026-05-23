import type { Components, JSX } from "../types/components";

interface RtkMeeting extends Components.RtkMeeting, HTMLElement {}
export const RtkMeeting: {
    prototype: RtkMeeting;
    new (): RtkMeeting;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
