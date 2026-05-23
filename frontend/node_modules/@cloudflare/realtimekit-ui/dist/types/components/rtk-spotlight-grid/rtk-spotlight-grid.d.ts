import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Meeting, Peer } from '../../types/rtk-client';
import { Size, States } from '../../types/props';
import { UIConfig } from '../../types/ui-config';
import { GridLayout, GridSize } from '../rtk-grid/rtk-grid';
/**
 * A grid component that renders two lists of participants: `pinnedParticipants` and `participants`.
 *
 * You can customize the layout to a `column` view, by default is is `row`.
 *
 * - Participants from `pinnedParticipants[]` are rendered inside a larger grid.
 * - Participants from `participants[]` array are rendered in a smaller grid.
 */
export declare class RtkSpotlightGrid {
    /** Grid Layout */
    layout: GridLayout;
    /** Participants */
    participants: Peer[];
    /** Pinned Participants */
    pinnedParticipants: Peer[];
    /**
     * Aspect Ratio of participant tile
     *
     * Format: `width:height`
     */
    aspectRatio: string;
    /** Gap between participant tiles */
    gap: number;
    /** Size */
    size: Size;
    /** Meeting object */
    meeting: Meeting;
    /** States object */
    states: States;
    /** UI Config */
    config: UIConfig;
    /** Icon Pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Grid size */
    gridSize: GridSize;
    host: HTMLRtkSpotlightGridElement;
    private getAdaptiveSize;
    render(): any;
}
