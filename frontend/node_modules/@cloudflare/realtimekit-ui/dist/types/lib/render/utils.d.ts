import { Size, States } from '../../types/props';
import { UIConfig, UIStyles } from '../../types/ui-config';
import { Element, StyleProps, UIRoot } from '../../types/ui-config/root';
interface ComputeSelectorsParameters {
    element: string;
    states: States;
    size: Size;
    config: UIConfig;
}
/**
 * Computes selectors and returns them based on their priority.
 */
export declare const computeSelectors: ({ element, size, states, config, }: ComputeSelectorsParameters) => string[];
interface GetComputedStyleParams {
    selectors: string[];
    styles: UIStyles;
}
/**
 * Returns the computed styles - styles obtained from combining styles from all computed selectors
 * on the basis of their priorities.
 */
export declare const getComputedStyles: ({ selectors, styles }: GetComputedStyleParams) => StyleProps;
interface GetComputedChildrenParams {
    selectors: string[];
    root: UIRoot;
}
/**
 * Returns the computed children which are to be rendered inside an element
 */
export declare const getComputedChildren: ({ selectors, root }: GetComputedChildrenParams) => Element[];
export {};
