import type { Components, JSX } from "../types/components";

interface RtkJoinStage extends Components.RtkJoinStage, HTMLElement {}
export const RtkJoinStage: {
    prototype: RtkJoinStage;
    new (): RtkJoinStage;
};
/**
 * Used to define this component and all nested components recursively.
 */
export const defineCustomElement: () => void;
