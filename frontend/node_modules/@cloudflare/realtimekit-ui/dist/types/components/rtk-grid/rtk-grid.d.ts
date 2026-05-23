import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Meeting, Peer } from '../../types/rtk-client';
import { Size, States } from '../../types/props';
import { UIConfig } from '../../types/ui-config';
import { RTKPlugin, leaveRoomState } from '@cloudflare/realtimekit';
export type GridLayout = 'row' | 'column';
export interface GridSize {
    spotlight?: Exclude<Size, 'xl'>;
    mixed?: Exclude<Size, 'xl'>;
}
type RoomState = 'init' | 'joined' | 'waitlisted' | leaveRoomState;
/**
 * The main grid component which abstracts all the grid handling logic and renders it for you.
 */
export declare class RtkGrid {
    private hideSelf;
    participants: Peer[];
    pinnedParticipants: Peer[];
    screenShareParticipants: Peer[];
    plugins: RTKPlugin[];
    emptyStage: boolean;
    showLiveStreamPlayer: boolean;
    canCurrentPeerHost: boolean;
    pipSupported: boolean;
    pipEnabled: boolean;
    hidden: boolean;
    roomState: RoomState;
    /** Grid Layout */
    layout: GridLayout;
    /** The aspect ratio of each participant */
    aspectRatio: string;
    /** Meeting object */
    meeting: Meeting;
    /** Gap between participants */
    gap: number;
    /** Size */
    size: Size;
    /** States */
    states: States;
    /** Config object */
    config: UIConfig;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Grid size */
    gridSize: GridSize;
    /** @deprecated  */
    overrides: any;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private disconnectMeeting;
    meetingChanged(meeting: Meeting, oldMeeting?: Meeting): void;
    overridesChanged(_overrides: any): void;
    screenShareParticipantsChanged(participants: Peer[]): void;
    pluginsChanged(plugins: RTKPlugin[]): void;
    pinnedParticipantsChanged(participants: Peer[]): void;
    private invalidRoomStates;
    private updateActiveParticipants;
    private updateStage;
    private filterParticipants;
    private onViewModeChanged;
    private addScreenShare;
    private removeScreenShare;
    private removePinned;
    private onParticipantJoined;
    private onParticipantLeft;
    private stageStatusListener;
    private peerStageStatusListener;
    private onScreenShareUpdate;
    private onSelfScreenShareUpdate;
    private toggleTileListener;
    private onPluginStateUpdate;
    private onParticipantPinned;
    private onParticipantUnpinned;
    private updateRoomStateListener;
    render(): any;
}
export {};
