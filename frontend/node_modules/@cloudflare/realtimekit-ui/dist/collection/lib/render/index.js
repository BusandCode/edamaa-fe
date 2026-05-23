import { h, Host } from "@stencil/core";
import { computeSelectors, getComputedChildren, getComputedStyles } from "./utils";
/**
 * Renders the children of an element.
 */
export const RenderChildren = ({ elements, defaults, props = {}, deepProps = false, elementProps = {}, }) => {
    if (!Array.isArray(elements) || elements.length === 0)
        return null;
    return elements.map((element) => {
        return (h(Render, { element: element, defaults: defaults, props: props, childProps: deepProps && props, elementProps: elementProps }));
    });
};
export const lenChildren = ({ element, defaults, props = {}, elementProps = {} }) => {
    var _a;
    const { config, size, states } = defaults;
    let Tag, configProps = {}, configChildren = [];
    if (Array.isArray(element)) {
        // get props if element is passed in array form:
        // ['rtk-participant-tile', { variant: 'gradient' }]
        [Tag, configProps, ...configChildren] = element;
    }
    else {
        Tag = element;
    }
    const elemData = (_a = config === null || config === void 0 ? void 0 : config.root) === null || _a === void 0 ? void 0 : _a[Tag];
    if (elemData != null && 'props' in elemData) {
        props = Object.assign(Object.assign({}, elemData['props']), props);
    }
    props = Object.assign(Object.assign({}, props), configProps);
    if (Tag in elementProps) {
        props = Object.assign(Object.assign({}, props), elementProps[Tag]);
    }
    const selectors = computeSelectors({ element: Tag, size, states, config });
    const computedChildren = getComputedChildren({ selectors, root: config.root });
    return computedChildren.length;
};
/**
 * Renders an element from UI Config
 */
export const Render = ({ element, defaults, childProps = {}, props = {}, onlyChildren = false, asHost = false, deepProps = false, elementProps = {}, }, children) => {
    var _a;
    const { config, size, states } = defaults;
    let Tag, configProps = {}, configChildren = [];
    if (Array.isArray(element)) {
        // get props if element is passed in array form:
        // ['rtk-participant-tile', { variant: 'gradient' }]
        [Tag, configProps, ...configChildren] = element;
    }
    else {
        Tag = element;
    }
    const elemData = (_a = config === null || config === void 0 ? void 0 : config.root) === null || _a === void 0 ? void 0 : _a[Tag];
    if (elemData != null && 'props' in elemData) {
        props = Object.assign(Object.assign({}, elemData['props']), props);
    }
    props = Object.assign(Object.assign({}, props), configProps);
    if (Tag in elementProps) {
        props = Object.assign(Object.assign({}, props), elementProps[Tag]);
    }
    const selectors = computeSelectors({ element: Tag, size, states, config });
    const computedChildren = getComputedChildren({ selectors, root: config.root });
    if (onlyChildren) {
        return (h(RenderChildren, { elements: computedChildren, defaults: defaults, props: childProps, deepProps: deepProps, elementProps: elementProps }));
    }
    const styles = getComputedStyles({ selectors, styles: config.styles });
    if (asHost) {
        return (h(Host, Object.assign({}, defaults, { style: styles }, props), h(RenderChildren, { elements: computedChildren, defaults: defaults, props: childProps, deepProps: deepProps, elementProps: elementProps }), children, configChildren.map((child) => {
            if (Array.isArray(child)) {
                const [Tag, props] = child;
                return h(Tag, Object.assign({}, defaults, props));
            }
            return child;
        })));
    }
    if (['rtk-header', 'rtk-controlbar'].includes(Tag)) {
        props['disableRender'] = true;
    }
    if (Tag.startsWith('rtk-')) {
        return (h(Tag, Object.assign({}, defaults, { style: styles }, props), h(RenderChildren, { elements: computedChildren, defaults: defaults, props: childProps, deepProps: deepProps, elementProps: elementProps }), children, configChildren.map((child) => {
            if (Array.isArray(child)) {
                const [Tag, props] = child;
                return h(Tag, Object.assign({}, defaults, props));
            }
            return child;
        })));
    }
    else {
        const [HTMLTag, id] = Tag.split('#');
        return (h(HTMLTag, Object.assign({ id: id, style: styles }, props), h(RenderChildren, { elements: computedChildren, defaults: defaults, props: childProps, deepProps: deepProps, elementProps: elementProps }), children, configChildren.map((child) => {
            if (Array.isArray(child)) {
                const [Tag, props] = child;
                return h(Tag, Object.assign({}, defaults, props));
            }
            return child;
        })));
    }
};
