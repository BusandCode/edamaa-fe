import { RTKPlugin } from '@cloudflare/realtimekit';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Meeting, Peer } from '../../types/rtk-client';
import { Size, States } from '../../types/props';
import { UIConfig } from '../../types/ui-config';
import { GridLayout, GridSize } from '../rtk-grid/rtk-grid';
import type { Tab } from '../rtk-tab-bar/rtk-tab-bar';
/**
 * A grid component which handles screenshares, plugins and participants.
 */
export declare class RtkMixedGrid {
    private activeTabUpdateListener;
    /** Grid Layout */
    layout: GridLayout;
    /** Participants */
    participants: Peer[];
    /** Pinned Participants */
    pinnedParticipants: Peer[];
    /** Screenshare Participants */
    screenShareParticipants: Peer[];
    /** Active Plugins */
    plugins: RTKPlugin[];
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
    activeTab: Tab;
    initialised: boolean;
    host: HTMLRtkMixedGridElement;
    componentWillLoad(): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    screenShareParticipantsChanged(participants?: Peer[]): void;
    pluginsChanged(plugins: RTKPlugin[]): void;
    private revalidateActiveTab;
    private setActiveTab;
    private reassignActiveTab;
    private onActiveTabUpdate;
    private getTabs;
    render(): any;
}
