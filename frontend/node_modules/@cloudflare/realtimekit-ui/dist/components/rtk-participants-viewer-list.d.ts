import type { Components, JSX } from "../types/components";

interface RtkParticipantsViewerList extends Components.RtkParticipantsViewerList, HTMLElement {}
export const RtkParticipantsViewerList: {
    prototype: RtkParticipantsViewerList;
    new (): RtkParticipantsViewerList;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
