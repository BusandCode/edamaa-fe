import { EventEmitter } from '../../stencil-public-runtime';
import { RtkI18n, IconPack } from '../../exports';
export declare class RtkFileDropzone {
    /** Host element on which drop events to attach */
    hostEl: HTMLElement;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** drop event callback */
    onDropCallback: EventEmitter<DragEvent>;
    dropzoneActivated: boolean;
    connectedCallback(): void;
    render(): any;
}
