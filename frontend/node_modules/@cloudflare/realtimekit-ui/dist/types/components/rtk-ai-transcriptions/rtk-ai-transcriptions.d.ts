import { RtkI18n } from '../../lib/lang';
import { Meeting } from '../../types/rtk-client';
import { Transcript } from '../../types/props';
export declare class RtkAiTranscriptions {
    private contentContainer;
    participantQuery: string;
    isProcessing: boolean;
    /** Language */
    t: RtkI18n;
    /** Meeting object */
    meeting: Meeting;
    transcriptions: Transcript[];
    /** Initial transcriptions */
    initialTranscriptions: Transcript[];
    private autoScrollEnabled;
    private transcriptionsReducer;
    connectedCallback(): void;
    componentDidLoad(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    transcriptionsChanged(): void;
    private onScroll;
    private onTranscriptHandler;
    private renderTranscripts;
    render(): any;
}
