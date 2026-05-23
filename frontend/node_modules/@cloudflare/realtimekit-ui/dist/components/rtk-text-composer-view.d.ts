import type { Components, JSX } from "../types/components";

interface RtkTextComposerView extends Components.RtkTextComposerView, HTMLElement {}
export const RtkTextComposerView: {
    prototype: RtkTextComposerView;
    new (): RtkTextComposerView;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
