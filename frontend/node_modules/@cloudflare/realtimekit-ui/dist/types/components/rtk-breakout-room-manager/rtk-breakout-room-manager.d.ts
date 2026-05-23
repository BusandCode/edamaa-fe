import { EventEmitter } from '../../stencil-public-runtime';
import { RtkI18n } from '../../lib/lang';
import { IconPack } from '../../lib/icons';
import { States } from '../../types/props';
import { Meeting } from '../../types/rtk-client';
import { DraftMeeting } from '../../utils/breakout-rooms-manager';
export declare class RtkBreakoutRoomManager {
    /** Meeting object */
    meeting: Meeting;
    /** Enable updating participants */
    assigningParticipants: boolean;
    /** Mode in which selector is used */
    mode: 'edit' | 'create';
    /** States object */
    states: States;
    /** allow room delete */
    allowDelete: boolean;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Drag mode */
    isDragMode: boolean;
    /** Connected Room Config Object */
    room: DraftMeeting;
    /** display expanded card by default */
    defaultExpanded: boolean;
    editingTitleRoomId: string;
    newTitle: string;
    showExpandedCard: boolean;
    glowingCard: boolean;
    /** Event for adding a participant */
    onParticipantsAdd: EventEmitter<null>;
    /** On Delete event emitter */
    onParticipantDelete: EventEmitter<{
        customParticipantId: string;
    }>;
    /** Event for joining a room */
    onRoomJoin: EventEmitter<null>;
    /** Event for deleting room */
    deleteRoom: EventEmitter<string>;
    /** Event for updating room details */
    updateRoom: EventEmitter<{
        title: string | undefined;
        id: string;
    }>;
    private allParticipants;
    private permissions;
    private roomTitle;
    private canEditMeetingTitle;
    private inputTextEl;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private permissionsUpdateListener;
    private reset;
    private onEditClick;
    private onDrop;
    private onDragOver;
    private onDragLeave;
    private getAssignmentHint;
    private toggleCardDisplay;
    private glowCard;
    private onAssign;
    private onJoin;
    private onTitleChanged;
    private renderPeer;
    private renderExpandedCardMaybe;
    private renderParticipantsMaybe;
    render(): any;
}
