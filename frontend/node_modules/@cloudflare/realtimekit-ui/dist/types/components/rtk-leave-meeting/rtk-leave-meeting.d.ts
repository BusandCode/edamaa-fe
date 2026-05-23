import { EventEmitter } from '../../stencil-public-runtime';
import { Meeting } from '../../types/rtk-client';
import { States } from '../../types/props';
import { RtkI18n } from '../../lib/lang';
import { IconPack } from '../../lib/icons';
/**
 * A component which allows you to leave a meeting or
 * end meeting for all, if you have the permission.
 */
export declare class RtkLeaveMeeting {
    private keyPressListener;
    /** Meeting object */
    meeting: Meeting;
    /** States object */
    states: States;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    canEndMeeting: boolean;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    private isBreakoutRoomsActive;
    private isChildMeeting;
    private canJoinMainRoom;
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    private permissionsUpdateListener;
    private close;
    private handleLeave;
    private handleJoinMainRoom;
    private handleEndMeeting;
    render(): any;
}
