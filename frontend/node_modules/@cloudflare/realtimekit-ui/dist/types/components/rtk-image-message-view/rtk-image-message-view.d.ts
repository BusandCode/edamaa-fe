import { EventEmitter } from '../../stencil-public-runtime';
import { RtkI18n, IconPack } from '../../exports';
/**
 * A component which renders an image message.
 */
export declare class RtkImageMessageView {
    /** Url of the image */
    url: string;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** preview event */
    onPreview: EventEmitter<string>;
    status: 'loading' | 'loaded' | 'errored';
    render(): any;
}
