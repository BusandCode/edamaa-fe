import type { ImageMessage } from '@cloudflare/realtimekit';
import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Size } from '../../types/props';
/**
 * A component which shows an image sent via chat.
 */
export declare class RtkImageViewer {
    /** Image message */
    image: ImageMessage;
    /** Size */
    size: Size;
    /** Language */
    t: RtkI18n;
    /** Icon pack */
    iconPack: IconPack;
    /** Emitted when viewer should be closed */
    close: EventEmitter<void>;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private keypressListener;
    private handleOutsideClick;
    render(): any;
}
