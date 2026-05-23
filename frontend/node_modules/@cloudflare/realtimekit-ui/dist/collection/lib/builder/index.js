import { createDefaultConfig } from "../default-ui-config";
/* eslint-disable no-console */
/*
    Elements can be of two types
    'rtk-mic-toggle' or ['rtk-mic-toggle', {prop: 1}]
    Custom findByName function to check for both
*/
function getFinder(query) {
    return (value) => {
        if (Array.isArray(value)) {
            return value[0] === query;
        }
        return value === query;
    };
}
/*
    Elements can be of two types
    'rtk-mic-toggle' or ['rtk-mic-toggle', {prop: 1}]
    Custom filterByName function to check for both
*/
function getFilter(query) {
    return (value) => {
        if (Array.isArray(value)) {
            return value[0] !== query;
        }
        return value !== query;
    };
}
/*
    transform JSX Component Name -> web component format
    eg. RtkMicToggle -> rtk-mic-toggle
*/
function convertComponentName(jsxName) {
    return jsxName.replace(/([a-z])([A-Z])/g, (g) => `${g[0]}-${g[1]}`.toLowerCase());
}
export class UIElemEditor {
    constructor(elem, config, keyString) {
        this.elem = elem;
        this.config = config;
        this.keyString = keyString;
    }
    /**
     * Adds an element to the chilren
     * @param el :Name of the element - `rtk-mic-toggle`
     * @param props :Optional props for the element `{variant: 'solid'}`
     */
    add(el, props = {}) {
        var _a;
        el = convertComponentName(el);
        let composedElem = el;
        if (Object.keys(props).length > 0) {
            composedElem = [el, props];
        }
        if (Array.isArray(this.elem)) {
            this.elem.push(composedElem);
        }
        else if ('children' in this.elem && Array.isArray(this.elem.children)) {
            this.elem.children = [...this.elem.children, composedElem];
        }
        else if ('remove' in this.elem &&
            Array.isArray(this.elem.remove) &&
            this.elem.remove.find(getFinder(el))) {
            this.elem.remove = this.elem.remove.filter(getFilter(el));
        }
        else {
            if (!('add' in this.elem)) {
                this.elem.add = [];
            }
            (_a = this.elem.add) === null || _a === void 0 ? void 0 : _a.push(composedElem);
        }
        return this;
    }
    /**
     * Removes an element from the chilren
     * @param el :Name of the element to remove - `rtk-mic-toggle`
     */
    remove(el) {
        var _a;
        el = convertComponentName(el);
        if (Array.isArray(this.elem)) {
            const idx = this.elem.findIndex(getFinder(el));
            if (idx > -1) {
                this.elem.splice(idx, 1);
            }
        }
        else if ('children' in this.elem && Array.isArray(this.elem.children)) {
            this.elem.children = this.elem.children.filter(getFilter(el));
        }
        else if ('add' in this.elem &&
            Array.isArray(this.elem.add) &&
            this.elem.add.find((e) => e === el)) {
            this.elem.add = this.elem.add.filter(getFilter(el));
        }
        else {
            if (!('remove' in this.elem)) {
                this.elem.remove = [];
            }
            (_a = this.elem.remove) === null || _a === void 0 ? void 0 : _a.push(el);
        }
        return this;
    }
    set style(s) {
        console.log(s);
        // TODO: Not Implemented
    }
    setChildrenProps(childElem, props) {
        console.log(this.keyString, childElem, props);
        // TODO: Not Implemented
    }
    getChildrenProps(childElem) {
        console.log(this.keyString, childElem);
        // TODO: Not Implemented
        return {};
    }
    replace(e) {
        console.log(this.config, e);
        // TODO: Not Implemented
    }
}
/* eslint-enable no-console */
export class RtkUiBuilder {
    constructor(config) {
        this.config = config || createDefaultConfig();
    }
    /**
     * Find an element anywhere in the hierarachy and returns an editor object
     * @param elem = 'rtk-participant-tile'
     * @param states = { activeSidebar: true, activeSettings: true, meeting: 'joined'}
     * @returns `UIElemEditor`
     */
    find(elem, states = {}) {
        elem = convertComponentName(elem);
        // eg. [activeSidebar, activeSettings]
        const booleanStates = [];
        // eg. [[meeting,joined]]
        const nonBooleanStates = [];
        Object.keys(states || {}).forEach((key) => {
            if (typeof states[key] === 'boolean') {
                booleanStates.push(key);
            }
            else {
                nonBooleanStates.push([key, states[key]]);
            }
        });
        booleanStates.sort();
        const root = this.config.root;
        if (root === undefined)
            return;
        let keyString = elem;
        let booleanStateString = '';
        if (booleanStates.length > 0) {
            // eg. '.activeSettings.activeSidebar'
            booleanStateString = `.${booleanStates.join('.')}`;
            // eg. 'rtk-participant-tile.activeSettings.activeSidebar'
            keyString = `${elem}${booleanStateString}`;
            // An element will only re-render when a state described in its `states` key changes
            // If the element has no states defined, ie. just array of children
            // convert to a complex element type
            if (Array.isArray(root[elem])) {
                root[elem] = {
                    states: [],
                    children: root[elem],
                };
            }
            if (root[elem].states === undefined) {
                root[elem].states = [];
            }
            // Add each boolean state if it is not there already
            booleanStates.forEach((e) => {
                var _a, _b;
                if (((_a = root[elem].states) === null || _a === void 0 ? void 0 : _a.indexOf(e)) === -1) {
                    (_b = root[elem].states) === null || _b === void 0 ? void 0 : _b.push(e);
                }
            });
        }
        if (nonBooleanStates.length > 0) {
            nonBooleanStates.forEach((k) => {
                // eg. '[meeting=joined]'
                const v = `[${k[0]}=${k[1]}]`;
                // eg. 'rtk-participant-tile[meeting=joined].activeSettings.activeSidebar'
                keyString = `${elem}${v}${booleanStateString}`;
                // An element will only re-render when a state described in its `states` key changes
                // If the element has no states defined, ie. just array of children
                // convert to a complex element type
                if (Array.isArray(root[elem])) {
                    root[elem] = {
                        state: k[0],
                        children: root[elem],
                    };
                }
            });
        }
        let target = root[keyString];
        if (target === undefined) {
            root[keyString] = {};
            target = root[keyString];
        }
        return new UIElemEditor(target, this.config, keyString);
    }
    build() {
        return this.config;
    }
}
