import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Meeting, Peer, WaitlistedParticipant } from '../../types/rtk-client';
import { Size, States } from '../../types/props';
import { ControlBarVariant } from '../rtk-controlbar-button/rtk-controlbar-button';
/**
 * A button which toggles visibility of participants.
 *
 * When clicked it emits a `rtkStateUpdate` event with the data:
 *
 * ```ts
 * { activeSidebar: boolean; sidebar: 'participants' }
 * ```
 */
export declare class RtkParticipantsToggle {
    private waitlistedParticipantJoinedListener;
    private waitlistedParticipantLeftListener;
    /** Variant */
    variant: ControlBarVariant;
    /** Meeting object */
    meeting: Meeting;
    /** States object */
    states: States;
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    participantsActive: boolean;
    waitlistedParticipants: WaitlistedParticipant[];
    stageRequestedParticipants: Peer[];
    badgeCount: number;
    canViewParticipants: boolean;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private updateStageRequests;
    private updateBadgeCount;
    meetingChanged(meeting: Meeting): void;
    statesChanged(states?: States): void;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    private toggleParticipantsTab;
    private updateCanView;
    handleParticipantsActiveChange(): void;
    private buttonEl;
    render(): any;
}
