import { Size, RtkI18n, IconPack } from '../../exports';
import { Meeting } from '../../types/rtk-client';
export declare class RtkLivestreamIndicator {
    /** Meeting object */
    meeting: Meeting;
    /** Size */
    size: Size;
    /** Language */
    t: RtkI18n;
    isLivestreaming: boolean;
    /** Icon pack */
    iconPack: IconPack;
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    private setIsLivestreaming;
    render(): any;
}
