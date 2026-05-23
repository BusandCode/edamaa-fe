import type { Components, JSX } from "../types/components";

interface RtkBreakoutRoomManager extends Components.RtkBreakoutRoomManager, HTMLElement {}
export const RtkBreakoutRoomManager: {
    prototype: RtkBreakoutRoomManager;
    new (): RtkBreakoutRoomManager;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
