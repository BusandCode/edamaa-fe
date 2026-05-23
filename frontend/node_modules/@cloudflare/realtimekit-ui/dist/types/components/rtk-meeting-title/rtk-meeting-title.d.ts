import { Meeting } from '../../types/rtk-client';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
/**
 * Displays the title of the meeting.
 */
export declare class RtkMeetingTitle {
    /** Meeting object */
    meeting: Meeting;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    render(): any;
}
