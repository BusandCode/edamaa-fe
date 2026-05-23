import { IconPack } from '../../lib/icons';
import { Size, States } from '../../types/props';
import { Meeting } from '../../types/rtk-client';
import { RtkI18n } from '../../lib/lang';
export type GridPaginationVariants = 'solid' | 'rounded' | 'grid';
/**
 * A component which allows you to change current page and view mode
 * of active participants list. This is reflected in the `rtk-grid` component.
 */
export declare class RtkGridPagination {
    /** Meeting object */
    meeting: Meeting;
    /** States */
    states: States;
    /** Size Prop */
    size: Size;
    /** Variant */
    variant: GridPaginationVariants;
    /** Icon Pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    page: number;
    pageCount: number;
    activeCount: number;
    activeComputedCount: number;
    showPagination: boolean;
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    sizeChanged(): void;
    private onPageChanged;
    private toggleGridPagination;
    private onParticipantJoin;
    private onParticipantLeave;
    private onStateStatusUpdate;
    private prevPage;
    private nextPage;
    render(): any;
}
