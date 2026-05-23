import { Host, h } from "@stencil/core";
/**
 * A button that follows RTK Design System.
 *
 * @slot - Default slot
 * @slot start - Content placed to the start of the button, i.e; left.
 * @slot end - Content placed to the end of the button, i.e; right.
 */
export class RtkButton {
    constructor() {
        /** Button variant */
        this.variant = 'primary';
        /** Button type */
        this.kind = 'button';
        /** Whether to reverse order of children */
        this.reverse = false;
        /** Where the button is disabled or not */
        this.disabled = false;
        /** Button type */
        this.type = 'button';
    }
    render() {
        return (h(Host, { key: '0f96cef4ae77a2be8013fa5d62d39626734eeced' }, h("button", { key: '8c06d5f5cc71779b8d56f31d2dd77b8d35e8b280', part: "button", type: this.type, disabled: this.disabled }, h("span", { key: 'ae741ddf8cc914f9493c26330b1f322541f64223', class: "start" }, h("slot", { key: '18275dab42a4dd38b5a59463ffca227e4a6df3c8', name: "start" })), h("span", { key: 'c2b912515b6edc2966c4cdb282c89022aa05c13f', class: "content", part: "content" }, h("slot", { key: '5d87993198e16a3b5f38e62979fa2ee5637a059d' })), h("span", { key: '0bc907da23ea362f8ae0b3fdf88452b1c3881078', class: "end" }, h("slot", { key: '0862eeefcfa5765ce605b99a04aab88222ed6e68', name: "end" })))));
    }
    static get is() { return "rtk-button"; }
    static get encapsulation() { return "shadow"; }
    static get delegatesFocus() { return true; }
    static get originalStyleUrls() {
        return {
            "$": ["rtk-button.css"]
        };
    }
    static get styleUrls() {
        return {
            "$": ["rtk-button.css"]
        };
    }
    static get properties() {
        return {
            "size": {
                "type": "string",
                "mutable": false,
                "complexType": {
                    "original": "Size",
                    "resolved": "\"lg\" | \"md\" | \"sm\" | \"xl\"",
                    "references": {
                        "Size": {
                            "location": "import",
                            "path": "../../types/props",
                            "id": "src/types/props.ts::Size"
                        }
                    }
                },
                "required": false,
                "optional": false,
                "docs": {
                    "tags": [],
                    "text": "Size"
                },
                "getter": false,
                "setter": false,
                "attribute": "size",
                "reflect": true
            },
            "variant": {
                "type": "string",
                "mutable": false,
                "complexType": {
                    "original": "ButtonVariant",
                    "resolved": "\"danger\" | \"ghost\" | \"primary\" | \"secondary\"",
                    "references": {
                        "ButtonVariant": {
                            "location": "local",
                            "path": "/home/runner/work/realtimekit-ui/realtimekit-ui/packages/core/src/components/rtk-button/rtk-button.tsx",
                            "id": "src/components/rtk-button/rtk-button.tsx::ButtonVariant"
                        }
                    }
                },
                "required": false,
                "optional": false,
                "docs": {
                    "tags": [],
                    "text": "Button variant"
                },
                "getter": false,
                "setter": false,
                "attribute": "variant",
                "reflect": true,
                "defaultValue": "'primary'"
            },
            "kind": {
                "type": "string",
                "mutable": false,
                "complexType": {
                    "original": "ButtonKind",
                    "resolved": "\"button\" | \"icon\" | \"wide\"",
                    "references": {
                        "ButtonKind": {
                            "location": "local",
                            "path": "/home/runner/work/realtimekit-ui/realtimekit-ui/packages/core/src/components/rtk-button/rtk-button.tsx",
                            "id": "src/components/rtk-button/rtk-button.tsx::ButtonKind"
                        }
                    }
                },
                "required": false,
                "optional": false,
                "docs": {
                    "tags": [],
                    "text": "Button type"
                },
                "getter": false,
                "setter": false,
                "attribute": "kind",
                "reflect": true,
                "defaultValue": "'button'"
            },
            "reverse": {
                "type": "boolean",
                "mutable": false,
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "required": false,
                "optional": false,
                "docs": {
                    "tags": [],
                    "text": "Whether to reverse order of children"
                },
                "getter": false,
                "setter": false,
                "attribute": "reverse",
                "reflect": true,
                "defaultValue": "false"
            },
            "disabled": {
                "type": "boolean",
                "mutable": false,
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "required": false,
                "optional": false,
                "docs": {
                    "tags": [],
                    "text": "Where the button is disabled or not"
                },
                "getter": false,
                "setter": false,
                "attribute": "disabled",
                "reflect": true,
                "defaultValue": "false"
            },
            "type": {
                "type": "string",
                "mutable": false,
                "complexType": {
                    "original": "HTMLButtonElement['type']",
                    "resolved": "\"button\" | \"reset\" | \"submit\"",
                    "references": {
                        "HTMLButtonElement": {
                            "location": "global",
                            "id": "global::HTMLButtonElement"
                        }
                    }
                },
                "required": false,
                "optional": false,
                "docs": {
                    "tags": [],
                    "text": "Button type"
                },
                "getter": false,
                "setter": false,
                "attribute": "type",
                "reflect": true,
                "defaultValue": "'button'"
            }
        };
    }
}
