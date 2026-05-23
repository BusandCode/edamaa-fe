import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Meeting, Peer } from '../../types/rtk-client';
import { Size, States } from '../../types/props';
import { UIConfig } from '../../types/ui-config';
import { Dimensions } from '../../lib/grid';
import { MediaConnectionState } from '@cloudflare/realtimekit';
/**
 * A grid component which renders only the participants in a simple grid.
 */
export declare class RtkSimpleGrid {
    private resizeObserver;
    /** Participants */
    participants: Peer[];
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
    dimensions: Dimensions;
    mediaConnection: MediaConnectionState;
    host: HTMLRtkSimpleGridElement;
    private setHostDimensions;
    connectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    disconnectedCallback(): void;
    render(): any;
}
