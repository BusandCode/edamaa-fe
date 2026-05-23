import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Meeting } from '../../types/rtk-client';
import { Size } from '../../types/props';
/**
 * A component which shows count of total joined participants in a meeting.
 */
export declare class RtkParticipantCount {
    private countListener;
    private stageUpdateListener;
    /** Meeting object */
    meeting: Meeting;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Size */
    size: Size;
    participantCount: number;
    isViewer: boolean;
    connectedCallback(): void;
    private disconnectMeeting;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting, oldMeeting?: Meeting): void;
    render(): any;
}
