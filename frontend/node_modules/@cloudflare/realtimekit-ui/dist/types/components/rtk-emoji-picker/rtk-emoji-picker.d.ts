import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { EmojiMetaData } from '../../types/props';
/**
 * A very simple emoji picker component.
 */
export declare class RtkEmojiPicker {
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Controls whether or not to focus on mount */
    focusWhenOpened: boolean;
    /** Close event */
    pickerClose: EventEmitter<void>;
    emojiList: any;
    filterVal: string;
    filteredEmojis: EmojiMetaData[];
    /**
     * Event which is emitted when an Emoji is clicked
     */
    emojiClicked: EventEmitter<string>;
    /** Input element ref */
    private inputElement;
    componentWillLoad(): void;
    componentDidLoad(): void;
    private handleInputChange;
    private handleEmojiClick;
    private mapEmojiList;
    render(): any;
}
