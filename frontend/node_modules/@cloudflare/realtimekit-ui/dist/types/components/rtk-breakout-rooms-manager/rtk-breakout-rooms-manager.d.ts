import { EventEmitter } from '../../stencil-public-runtime';
import { RtkI18n } from '../../lib/lang';
import { IconPack } from '../../lib/icons';
import { PartialStateEvent, States } from '../../types/props';
import { Meeting } from '../../types/rtk-client';
import { DraftMeeting } from '../../utils/breakout-rooms-manager';
export type BreakoutManagerState = 'room-config' | 'participants-config';
export type BreakoutRoomConfig = {
    rooms: number;
    step: BreakoutManagerState;
    mode: 'edit' | 'create';
    applyingChanges: boolean;
};
export declare class RtkBreakoutRoomsManager {
    private selectorRef;
    private permissions;
    /** Flag to indicate busy state */
    loading: boolean;
    /** Breakout room config object */
    roomConfig: BreakoutRoomConfig;
    private stateManager;
    /** draft state */
    draftState: {
        parentMeeting: DraftMeeting;
        meetings: DraftMeeting[];
    };
    /** List of assigned participants */
    /** Flag that tells if participants are being assigned or not */
    assigningParticipants: boolean;
    /** List of selected peers */
    selectedParticipants: string[];
    /** update about room changes */
    ephemeralStatusText: string;
    /** Flag that tells if participants are being dragged */
    isDragMode: boolean;
    /** Meeting object */
    meeting: Meeting;
    /** States object */
    states: States;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Emits updated state data */
    stateUpdate: EventEmitter<PartialStateEvent>;
    onSelectedParticipantsChanged(participants: any): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private permissionsUpdateListener;
    private fetchRoomState;
    private updateLocalState;
    private setEphemeralStatus;
    private onCreateRooms;
    private onAddNewRoom;
    private onRoomUpdate;
    private onRoomDelete;
    onParticipantDelete(event: CustomEvent): void;
    toggleDragMode(e: CustomEvent): void;
    private assignParticipantsRandomly;
    private unassignParticipant;
    private onUnassignAll;
    private assignParticipantsToRoom;
    private joinRoom;
    private closeBreakout;
    private handleClose;
    private enableConfirmationModal;
    private close;
    private applyChanges;
    updateSelectedParticipants(e: CustomEvent): void;
    updateAllParticipants(e: CustomEvent): void;
    private getStatusText;
    private getApproxDistribution;
    private deselectAll;
    private discardChanges;
    private shouldShowOnlyRoomSwitcher;
    private getPermittedRooms;
    private renderMainRoomMaybe;
    private renderRoomSwitcher;
    private renderLoading;
    private renderRoomConfig;
    render(): any;
}
