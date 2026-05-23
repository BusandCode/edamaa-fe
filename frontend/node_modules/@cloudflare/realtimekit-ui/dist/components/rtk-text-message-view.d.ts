import type { Components, JSX } from "../types/components";

interface RtkTextMessageView extends Components.RtkTextMessageView, HTMLElement {}
export const RtkTextMessageView: {
    prototype: RtkTextMessageView;
    new (): RtkTextMessageView;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
