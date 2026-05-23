import { EventEmitter } from '../../stencil-public-runtime';
import { RtkI18n, IconPack } from '../../exports';
export declare class RtkFilePickerButton {
    /** File type filter to open file picker with */
    filter: string;
    /** Label for tooltip */
    label: string;
    /** Icon */
    icon: keyof IconPack;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Event when a file is selected for upload */
    onFileChange: EventEmitter<File>;
    private fileInputField;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private uploadFile;
    render(): any;
}
