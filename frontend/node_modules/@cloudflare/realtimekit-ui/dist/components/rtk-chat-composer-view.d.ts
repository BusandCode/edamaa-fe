import type { Components, JSX } from "../types/components";

interface RtkChatComposerView extends Components.RtkChatComposerView, HTMLElement {}
export const RtkChatComposerView: {
    prototype: RtkChatComposerView;
    new (): RtkChatComposerView;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
