import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Meeting } from '../../types/rtk-client';
export type ViewerCountVariant = 'primary' | 'embedded';
/**
 * A component which shows count of total joined participants in a meeting.
 */
export declare class RtkViewerCount {
    private countListener;
    /** Meeting object */
    meeting: Meeting;
    /** Viewer count variant */
    variant: ViewerCountVariant;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    viewerCount: number;
    connectedCallback(): void;
    private disconnectMeeting;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting, oldMeeting?: Meeting): void;
    render(): any;
}
