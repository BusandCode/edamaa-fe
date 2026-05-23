import type { Components, JSX } from "../types/components";

interface RtkBreakoutRoomsManager extends Components.RtkBreakoutRoomsManager, HTMLElement {}
export const RtkBreakoutRoomsManager: {
    prototype: RtkBreakoutRoomsManager;
    new (): RtkBreakoutRoomsManager;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
