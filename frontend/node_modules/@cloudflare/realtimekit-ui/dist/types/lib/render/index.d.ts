import { FunctionalComponent } from '../../stencil-public-runtime';
import { Meeting } from '../../types/rtk-client';
import { Size, States } from '../../types/props';
import { UIConfig } from '../../types/ui-config';
import { Element } from '../../types/ui-config/root';
import { IconPack } from '../icons';
import { RtkI18n } from '../lang';
export interface DefaultProps {
    meeting: Meeting;
    config: UIConfig;
    size: Size;
    states: States;
    iconPack: IconPack;
    t: RtkI18n;
}
export interface Props {
    [prop: string]: any;
}
interface RenderChildrenProps {
    elements: Element[];
    defaults: DefaultProps;
    props?: Props;
    deepProps?: boolean;
    elementProps?: Props;
}
/**
 * Renders the children of an element.
 */
export declare const RenderChildren: FunctionalComponent<RenderChildrenProps>;
interface RenderProps {
    element: Element;
    defaults: DefaultProps;
    props?: Props;
    childProps?: Props;
    onlyChildren?: boolean;
    asHost?: boolean;
    deepProps?: boolean;
    elementProps?: Props;
}
export declare const lenChildren: ({ element, defaults, props, elementProps }: RenderProps) => number;
/**
 * Renders an element from UI Config
 */
export declare const Render: FunctionalComponent<RenderProps>;
export {};
