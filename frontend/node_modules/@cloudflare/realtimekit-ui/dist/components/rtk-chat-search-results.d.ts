import type { Components, JSX } from "../types/components";

interface RtkChatSearchResults extends Components.RtkChatSearchResults, HTMLElement {}
export const RtkChatSearchResults: {
    prototype: RtkChatSearchResults;
    new (): RtkChatSearchResults;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
