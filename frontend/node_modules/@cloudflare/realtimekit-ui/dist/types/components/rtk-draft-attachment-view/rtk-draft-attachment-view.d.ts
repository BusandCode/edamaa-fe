import { EventEmitter } from '../../stencil-public-runtime';
import { RtkI18n, IconPack } from '../../exports';
/**
 * A component which renders the draft attachment to send
 */
export declare class RtkDraftAttachmentView {
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Attachment to display */
    attachment: {
        type: 'image' | 'file';
        file: File;
    };
    filePreview: string;
    /** Event triggered when the attachment is deleted */
    onDeleteAttachment: EventEmitter;
    private fileReader;
    onAttachmentChange(): void;
    connectedCallback(): void;
    componentWillLoad(): void;
    private generatePreview;
    private onDeleteClickHandler;
    render(): any;
}
