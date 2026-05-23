import type { Components, JSX } from "../types/components";

interface RtkPoll extends Components.RtkPoll, HTMLElement {}
export const RtkPoll: {
    prototype: RtkPoll;
    new (): RtkPoll;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
