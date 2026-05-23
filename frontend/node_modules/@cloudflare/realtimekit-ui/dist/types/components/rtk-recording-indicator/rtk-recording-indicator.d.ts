import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Meeting } from '../../types/rtk-client';
import { Size } from '../../types/props';
/**
 * A component which indicates the recording status of a meeting.
 *
 * It will not render anything if no recording is taking place.
 */
export declare class RtkRecordingIndicator {
    private updateRecordingStatus;
    /** Meeting object */
    meeting: Meeting;
    /** Size */
    size: Size;
    /** Language */
    t: RtkI18n;
    /** Icon pack */
    iconPack: IconPack;
    isRecording: boolean;
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    private setIsRecording;
    render(): any;
}
