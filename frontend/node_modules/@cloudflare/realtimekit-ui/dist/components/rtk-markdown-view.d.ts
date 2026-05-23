import type { Components, JSX } from "../types/components";

interface RtkMarkdownView extends Components.RtkMarkdownView, HTMLElement {}
export const RtkMarkdownView: {
    prototype: RtkMarkdownView;
    new (): RtkMarkdownView;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
