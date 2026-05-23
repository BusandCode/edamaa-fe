import type { Components, JSX } from "../types/components";

interface RtkLeaveMeeting extends Components.RtkLeaveMeeting, HTMLElement {}
export const RtkLeaveMeeting: {
    prototype: RtkLeaveMeeting;
    new (): RtkLeaveMeeting;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
