import { EventEmitter } from '../../stencil-public-runtime';
import { RtkI18n, IconPack } from '../../exports';
/**
 * A component which renders a text composer
 */
export declare class RtkTextComposerView {
    /** Disable the text input (default = false) */
    disabled: boolean;
    /** Placeholder text */
    placeholder: string;
    /** Default value for text input */
    value: string;
    /** Max length for text input */
    maxLength: number;
    /** Boolean to indicate if rate limit is breached */
    rateLimitBreached: boolean;
    /** Keydown event handler function */
    keyDownHandler: (e: KeyboardEvent) => void;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Event emitted when text changes */
    onTextChange: EventEmitter<string>;
    maxLengthBreached: number;
    private $textArea;
    componentDidLoad(): void;
    /** Sets value of the text input */
    setText(text: string, focus?: boolean): Promise<void>;
    private checkLength;
    private onInputHandler;
    private maybeResize;
    render(): any;
}
