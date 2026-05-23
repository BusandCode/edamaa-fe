import type { Components, JSX } from "../types/components";

interface RtkConfirmationModal extends Components.RtkConfirmationModal, HTMLElement {}
export const RtkConfirmationModal: {
    prototype: RtkConfirmationModal;
    new (): RtkConfirmationModal;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
