import type { Components, JSX } from "../types/components";

interface RtkMeetingTitle extends Components.RtkMeetingTitle, HTMLElement {}
export const RtkMeetingTitle: {
    prototype: RtkMeetingTitle;
    new (): RtkMeetingTitle;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
