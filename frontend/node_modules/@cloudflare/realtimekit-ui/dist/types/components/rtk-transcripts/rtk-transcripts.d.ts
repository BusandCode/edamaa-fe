import { Meeting } from '../../types/rtk-client';
import { Transcript, States } from '../../types/props';
import { RtkI18n } from '../../lib/lang';
import { UIConfig } from '../../types/ui-config';
/**
 * A component which handles transcripts.
 *
 * You can configure which transcripts you want to see and which ones you want to hear.
 * There are also certain limits which you can set as well.
 */
export declare class RtkTranscripts {
    private disconnectTimeout;
    host: HTMLRtkTranscriptsElement;
    /** Meeting object */
    meeting: Meeting;
    /** States object */
    states: States;
    /** Config object */
    config: UIConfig;
    /** Language */
    t: RtkI18n;
    transcripts: Array<Transcript & {
        renderedId?: string;
    }>;
    listenerAttached: boolean;
    connectedCallback(): void;
    private addListener;
    private clearListeners;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting, oldMeeting?: Meeting): void;
    statesChanged(states?: States): void;
    private onTranscript;
    private transcriptionsReducer;
    private add;
    private remove;
    private handleDismiss;
    private renderTranscripts;
    render(): any;
}
