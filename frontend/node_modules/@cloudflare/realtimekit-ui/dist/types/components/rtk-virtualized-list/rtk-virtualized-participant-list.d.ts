import { Peer } from '../..';
export declare class RtkVirtualizedParticipantList {
    /** Items to be virtualized */
    items: Peer[];
    /** Function to render each item */
    renderItem: (item: Peer, index: number) => HTMLElement;
    /** Height of each item in pixels (assumed fixed) */
    itemHeight: number;
    /** Buffer items to render before and after the visible area */
    bufferedItemsCount: number;
    /** Element to render if list is empty */
    emptyListElement: HTMLElement;
    /** The reference to the container element */
    el: HTMLRtkVirtualizedParticipantListElement;
    visibleStart: number;
    visibleEnd: number;
    private containerHeight;
    private lastScrollTop;
    itemsChanged(): void;
    componentDidLoad(): void;
    private recalculatePositioning;
    componentDidUpdate(): void;
    disconnectedCallback(): void;
    private updateContainerHeight;
    private onScroll;
    private updateVisibleRange;
    private updateItemHeight;
    private renderItems;
    render(): any;
}
