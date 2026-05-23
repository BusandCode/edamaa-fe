type Children = Element | string;
export type Element = string | [string, ElementProps?, ...Children[]];
export interface ElementProps {
    [key: string]: any;
}
export interface StyleProps {
    [key: string]: string;
}
export interface UIRoot {
    [element: string]: Element[] | {
        state?: string;
        states?: string[];
        props?: {
            [key: string]: any;
        };
        children?: Element[];
        add?: Element[];
        prepend?: Element[];
        remove?: string[];
        addBefore?: Record<string, Element[]>;
    };
}
export {};
