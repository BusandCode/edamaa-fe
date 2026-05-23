import type { Components, JSX } from "../types/components";

interface RtkOverlayModal extends Components.RtkOverlayModal, HTMLElement {}
export const RtkOverlayModal: {
    prototype: RtkOverlayModal;
    new (): RtkOverlayModal;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
