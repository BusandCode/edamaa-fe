import { IconPack } from '../../lib/icons';
import { Meeting } from '../../types/rtk-client';
import { Size } from '../../types/props';
/**
 * Shows the time elapsed in a meeting.
 */
export declare class RtkClock {
    private timeout;
    private request;
    /** Meeting object */
    meeting: Meeting;
    /** Icon pack */
    iconPack: IconPack;
    /** Size */
    size: Size;
    startedTime: string;
    timeDiff: number;
    connectedCallback(): void;
    private disconnectMeeting;
    private startedTimeUpdateListener;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    startedTimeChanged(startedTime: string): void;
    private getFormattedTime;
    render(): any;
}
