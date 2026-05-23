import { UIConfig } from '../../exports';
import { UIRoot, StyleProps } from '../../types/ui-config/root';
type UIElem = UIRoot['string'];
type KeyValuePair = {
    [key: string]: string;
};
export declare class UIElemEditor {
    private elem;
    private config;
    private keyString;
    constructor(elem: UIElem, config: UIConfig, keyString: string);
    /**
     * Adds an element to the chilren
     * @param el :Name of the element - `rtk-mic-toggle`
     * @param props :Optional props for the element `{variant: 'solid'}`
     */
    add(el: string, props?: KeyValuePair): this;
    /**
     * Removes an element from the chilren
     * @param el :Name of the element to remove - `rtk-mic-toggle`
     */
    remove(el: string): this;
    set style(s: StyleProps);
    setChildrenProps(childElem: string, props: KeyValuePair): void;
    getChildrenProps(childElem: string): KeyValuePair;
    replace(e: HTMLElement): void;
}
export declare class RtkUiBuilder {
    private config;
    constructor(config?: UIConfig);
    /**
     * Find an element anywhere in the hierarachy and returns an editor object
     * @param elem = 'rtk-participant-tile'
     * @param states = { activeSidebar: true, activeSettings: true, meeting: 'joined'}
     * @returns `UIElemEditor`
     */
    find(elem: string, states?: {
        [key: string]: string | boolean;
    }): UIElemEditor | undefined;
    build(): UIConfig;
}
export {};
