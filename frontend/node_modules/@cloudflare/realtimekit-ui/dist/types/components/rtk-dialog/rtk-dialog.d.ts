import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Meeting } from '../../types/rtk-client';
import { Size, States } from '../../types/props';
import { UIConfig } from '../../types/ui-config';
/**
 * A dialog component.
 */
export declare class RtkDialog {
    /** Whether to show the close button */
    hideCloseButton: boolean;
    /** Whether Escape key can close the modal */
    disableEscapeKey: boolean;
    /** Meeting object */
    meeting: Meeting;
    /** UI Config */
    config: UIConfig;
    /** States object */
    states: States;
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Whether a dialog is open or not */
    open: boolean;
    /** Event emitted when dialog is closed */
    onClose: EventEmitter;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private close;
    private keydownListener;
    private dialogEl;
    componentDidRender(): void;
    render(): any;
}
