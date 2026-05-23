import { Meeting } from '../types/rtk-client';
import { ConnectedMeetingParticipant } from '../types/props';
import { ConnectedMeetingState } from '../types/props';
export type DraftMeeting = {
    id: string;
    title: string;
    participants: ConnectedMeetingParticipant[];
    isParent: boolean;
};
export default class BreakoutRoomsManager {
    #private;
    get hasLocalChanges(): boolean;
    get currentState(): {
        parentMeeting: DraftMeeting;
        meetings: DraftMeeting[];
    };
    get allConnectedMeetings(): DraftMeeting[];
    get allParticipants(): ConnectedMeetingParticipant[];
    get unassignedParticipants(): ConnectedMeetingParticipant[];
    /**
     * get participants of a meeting
     */
    getParticipantsForMeeting(meetingId: string): ConnectedMeetingParticipant[];
    /**
     * add a new connected meeting
     */
    addNewMeeting(): {
        id: string;
        title: string;
    };
    /**
     * add multiple new connected meetings
     */
    addNewMeetings(count: number): {
        id: string;
        title: string;
    }[];
    /**
     * update a meeting's title
     */
    updateMeetingTitle(meetingId: string, newTitle: string): void;
    /**
     * deleteMeeting
     */
    deleteMeeting(meetingId: string): void;
    /**
     * assign participants to a meeting
     */
    assignParticipantsToMeeting(customParticipantIds: string[], destinationMeetingId: string): {
        parentMeeting: DraftMeeting;
        meetings: DraftMeeting[];
    };
    /**
     * assign participants randomly
     */
    assignParticipantsRandomly(): {
        parentMeeting: DraftMeeting;
        meetings: DraftMeeting[];
    };
    /**
     * unassign participants
     */
    unassignParticipants(customParticipantIds: string[]): {
        parentMeeting: DraftMeeting;
        meetings: DraftMeeting[];
    };
    /**
     * unassign all participants
     */
    unassignAllParticipants(): {
        parentMeeting: DraftMeeting;
        meetings: DraftMeeting[];
    };
    /**
     * update current state
     */
    updateCurrentState(state: ConnectedMeetingState): void;
    get meetingsToCreate(): {
        id: string;
        title: string;
    }[];
    get meetingsToUpdate(): {
        id: string;
        title: string;
    }[];
    get meetingsToDelete(): string[];
    get participantsToMove(): {
        sourceMeetingId: string;
        destinationMeetingId: string;
        participantIds: string[];
    }[];
    applyChanges(meeting: Meeting): Promise<void>;
    /**
     * discard local changes
     */
    discardChanges(): {
        parentMeeting: DraftMeeting;
        meetings: DraftMeeting[];
    };
}
