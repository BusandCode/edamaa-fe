import { UIConfig, Size, IconPack, RtkI18n } from '../../exports';
import { Meeting, WaitlistedParticipant } from '../../types/rtk-client';
import { ParticipantsViewMode } from '../rtk-participants/rtk-participants';
export declare class RtkParticipantsWaitlisted {
    private waitlistedParticipantJoinedListener;
    private waitlistedParticipantLeftListener;
    private waitlistedParticipantsClearedListener;
    /** Meeting object */
    meeting: Meeting;
    /** Config */
    config: UIConfig;
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    /** View mode for participants list */
    view: ParticipantsViewMode;
    /** Language */
    t: RtkI18n;
    private acceptWaitingRoomRequest;
    waitlistedParticipants: WaitlistedParticipant[];
    private acceptAllWaitingRoomRequests;
    private rejectWaitingRoomRequest;
    disconnectedCallback(): void;
    connectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    private shouldShowWaitlist;
    render(): any;
}
