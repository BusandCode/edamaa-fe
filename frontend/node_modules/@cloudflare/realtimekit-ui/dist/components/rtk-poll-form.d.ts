import type { Components, JSX } from "../types/components";

interface RtkPollForm extends Components.RtkPollForm, HTMLElement {}
export const RtkPollForm: {
    prototype: RtkPollForm;
    new (): RtkPollForm;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
