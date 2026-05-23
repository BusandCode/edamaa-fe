import { IconPack } from '../../lib/icons';
import { Meeting } from '../../types/rtk-client';
import { EventEmitter } from '../../stencil-public-runtime';
import { RtkI18n } from '../../lib/lang';
import type { RTKConnectedMeetings } from '@cloudflare/realtimekit';
type ConnectedPeer = RTKConnectedMeetings['parentMeeting']['participants'][number];
/**
 * A component which lists all participants, with ability to
 * run privileged actions on each participant according to your permissions.
 */
export declare class RtkBreakoutRoomParticipants {
    /** Meeting object */
    meeting: Meeting;
    /** Participant ids */
    participantIds: string[];
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    search: string;
    participantsToShow: ConnectedPeer[];
    /** Emits an event when selected participants are updated */
    onSelectedParticipantsUpdate: EventEmitter<string[]>;
    /** Emits an event when all participants are selected or deselected */
    onAllToggled: EventEmitter<string[]>;
    /** Emits an event when participants are dragged */
    onParticipantsDragging: EventEmitter<boolean>;
    /** selected participants */
    selectedParticipantIds: string[];
    isDragging: boolean;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private updateSelectedParticipants;
    meetingChanged(meeting: Meeting): void;
    participantsChanged(): void;
    searchChanged(search: string): void;
    private getParticipants;
    private onSearchInput;
    private onDragStart;
    private onDragEnd;
    private onClick;
    private onToggleAll;
    private renderPeer;
    render(): any;
}
export {};
