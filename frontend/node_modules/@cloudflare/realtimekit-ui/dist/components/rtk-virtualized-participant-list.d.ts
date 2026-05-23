import type { Components, JSX } from "../types/components";

interface RtkVirtualizedParticipantList extends Components.RtkVirtualizedParticipantList, HTMLElement {}
export const RtkVirtualizedParticipantList: {
    prototype: RtkVirtualizedParticipantList;
    new (): RtkVirtualizedParticipantList;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
