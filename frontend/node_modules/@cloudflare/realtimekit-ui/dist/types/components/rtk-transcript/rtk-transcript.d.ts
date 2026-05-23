import { EventEmitter } from '../../stencil-public-runtime';
import { RtkI18n } from '../../lib/lang';
import { Transcript } from '../../types/props';
/**
 * A component which shows a transcript.
 *
 * You need to remove the element after you receive the
 * `rtkTranscriptDismiss` event.
 */
export declare class RtkTranscript {
    /** Message */
    transcript: Transcript & {
        renderedId?: string;
    };
    /** Language */
    t: RtkI18n;
    /** Dismiss event */
    dismiss: EventEmitter<{
        id: string;
        renderedId: string;
    }>;
    timeout: NodeJS.Timeout;
    connectedCallback(): void;
    transcriptChanged(transcript: Transcript & {
        renderedId?: string;
    }, oldTranscript?: Transcript & {
        renderedId?: string;
    }): void;
    render(): any;
}
