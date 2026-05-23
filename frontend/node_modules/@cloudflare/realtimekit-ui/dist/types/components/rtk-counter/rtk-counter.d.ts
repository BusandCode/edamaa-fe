import { EventEmitter } from '../../stencil-public-runtime';
import { Size, IconPack } from '../../exports';
import { RtkI18n } from '../../lib/lang';
/**
 * A number picker with increment and decrement buttons.
 */
export declare class RtkCounter {
    /** Input */
    input: string;
    /** Size */
    size: Size;
    /** Initial value */
    value: number;
    /** Minimum value */
    minValue: number;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** On change event emitter */
    onChange: EventEmitter<string>;
    connectedCallback(): void;
    watchStateHandler(input: string): void;
    private increment;
    private decrement;
    render(): any;
}
