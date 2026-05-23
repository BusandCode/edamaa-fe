import { RtkI18n, IconPack } from '../../exports';
import { Meeting, Peer } from '../../types/rtk-client';
export declare class RtkNetworkIndicator {
    /** Participant or Self */
    participant: Peer;
    /** Meeting */
    meeting: Meeting;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Is for screenshare */
    isScreenShare: boolean;
    score: number;
    connectedCallback(): void;
    participantChanged(participant: Peer): void;
    disconnectedCallback(): void;
    private onMediaScoreUpdate;
    render(): any;
}
