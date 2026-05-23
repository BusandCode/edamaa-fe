import { IconPack } from '../../exports';
interface Message {
    id: string;
    [key: string]: any;
}
/**
 * A component which renders list of messages.
 */
export declare class RtkMessageListView {
    /** Messages to render */
    messages: Message[];
    /** Render function of the message */
    renderer: (message: Message, index: number) => HTMLElement;
    /**
     * Function to load more messages.
     * Messages returned from this will be preprended
     */
    loadMore: (lastMessage: Message) => Promise<Message[]>;
    /** Maximum visible messages */
    visibleItemsCount: number;
    /** Estimated height of an item */
    estimateItemSize: number;
    /** Icon pack */
    iconPack: IconPack;
    range: {
        start: number;
        end: number;
    };
    isFetching: boolean;
    autoScroll: boolean;
    totalHeight: number;
    private $listRef;
    private $listEndRef;
    private sizes;
    private lastScrollTop;
    private scrollToBottomRetries;
    private elementObserver;
    connectedCallback(): void;
    componentDidLoad(): void;
    messagesUpdated(newValue: Message[], previousValue: Message[]): void;
    private measureElement;
    private getVisibleItems;
    private updateVisibleItems;
    private getEstimatedItemSize;
    private getRangeSize;
    private getScrollTop;
    private getClientHeight;
    private getScrollHeight;
    private getItemsScrolled;
    private getEndByStart;
    private scrollToOffset;
    private scrollToIndex;
    private scrollToBottom;
    private handleScroll;
    private handleTop;
    private handleBottom;
    private updateTotalHeight;
    private saveItemSize;
    private rendererInternal;
    render(): any;
}
export {};
