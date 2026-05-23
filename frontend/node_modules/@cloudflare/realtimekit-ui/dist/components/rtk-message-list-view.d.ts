import type { Components, JSX } from "../types/components";

interface RtkMessageListView extends Components.RtkMessageListView, HTMLElement {}
export const RtkMessageListView: {
    prototype: RtkMessageListView;
    new (): RtkMessageListView;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
