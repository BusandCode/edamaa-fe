/**
 * Computes selectors and returns them based on their priority.
 */
export const computeSelectors = ({ element, size, states = {}, config = {}, }) => {
    let selectors = [];
    const data = config === null || config === void 0 ? void 0 : config.root[element];
    const add = (selector) => {
        selectors.push(selector);
        if (typeof size === 'string') {
            selectors.push(`${selector}.${size}`);
        }
    };
    add(element);
    if (typeof data === 'object' && !Array.isArray(data) && data !== null) {
        // check if the data variable is an object, strictly and not an array or just null
        const { state, states: elementStates } = data;
        let selector = element;
        let activeStates = [];
        if (Array.isArray(elementStates)) {
            activeStates = elementStates.filter((state) => states[state]);
            activeStates.sort();
            for (const state of activeStates) {
                add(`${selector}.${state}`);
            }
            if (activeStates.length > 1) {
                const booleanStateSelector = [selector, ...activeStates].join('.');
                add(booleanStateSelector);
            }
        }
        if (typeof state === 'string') {
            // rtk-meeting[meeting=joined]
            const keyValueSelector = `${element}[${state}=${states[state]}]`;
            add(keyValueSelector);
            for (const state of activeStates) {
                add(`${keyValueSelector}.${state}`);
            }
            if (activeStates.length > 1) {
                const withBooleanStateSelector = [keyValueSelector, ...activeStates].join('.');
                add(withBooleanStateSelector);
            }
        }
    }
    return selectors;
};
/**
 * Returns the computed styles - styles obtained from combining styles from all computed selectors
 * on the basis of their priorities.
 */
export const getComputedStyles = ({ selectors, styles }) => {
    if (!Array.isArray(selectors) || styles == null)
        return {};
    const computedStyles = {};
    for (const selector of selectors) {
        const style = styles[selector];
        if (style != null) {
            Object.assign(computedStyles, style);
        }
    }
    return computedStyles;
};
/**
 * Returns the computed children which are to be rendered inside an element
 */
export const getComputedChildren = ({ selectors, root }) => {
    if (!root || !Array.isArray(selectors))
        return [];
    let children = [];
    for (const selector of selectors) {
        const el = root[selector];
        if (Array.isArray(el)) {
            children = [...el];
        }
        else if (el) {
            if (el.children) {
                children = [...el.children];
            }
            if (Array.isArray(el.remove)) {
                for (const toRemove of el.remove) {
                    children = children.filter((child) => {
                        if (typeof child === 'string') {
                            return child !== toRemove;
                        }
                        else if (Array.isArray(child)) {
                            return child[0] !== toRemove;
                        }
                        return true;
                    });
                }
            }
            if (el.addBefore) {
                for (const [beforeEl, toAdd] of Object.entries(el.addBefore)) {
                    const idx = children.findIndex((child) => {
                        if (typeof child === 'string') {
                            return child === beforeEl;
                        }
                        else if (Array.isArray(child)) {
                            return child[0] === beforeEl;
                        }
                        return false;
                    });
                    if (idx >= 0) {
                        children.splice(idx, 0, ...toAdd);
                    }
                }
            }
            if (Array.isArray(el.add)) {
                children = children.concat(el.add);
            }
            if (Array.isArray(el.prepend)) {
                children = el.prepend.concat(children);
            }
        }
    }
    return children;
};
