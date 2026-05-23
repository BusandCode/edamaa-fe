import { Meeting } from '../types/rtk-client';
export declare function getNextRoomNumber(): number;
export declare function resetRoomCount(): void;
export declare const TEMP_ROOM_PREFIX = "temp-";
export declare function createDraftRoom(): {
    id: string;
    title: string;
    participants: any[];
};
export declare function createDraftRooms(numberOfRooms: number): {
    id: string;
    title: string;
    participants: any[];
}[];
export declare function isDraftRoom(roomId: string): boolean;
export declare function splitCollection<T>(collection: T[], parts: number): T[][];
export declare function participantIdentifier(participant: any): any;
export declare function getAllConnectedParticipants(meeting: Meeting): {
    id: string;
    customParticipantId: any;
    displayName: string;
    displayPictureUrl: string;
}[];
export declare const canToggleBreakout: (meeting: Meeting) => boolean;
