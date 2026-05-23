import { EventEmitter } from '../../stencil-public-runtime';
import { Meeting } from '../../types/rtk-client';
import { RtkI18n } from '../../lib/lang';
import { IconPack } from '../../lib/icons';
/**
 * A component which plays all the audio from participants and screenshares.
 */
export declare class RtkParticipantsAudio {
    private audio;
    private audioUpdateListener;
    private participantLeftListener;
    private screenShareUpdateListener;
    private deviceUpdateListener;
    private stageStatusUpdateListener;
    /** Meeting object */
    meeting: Meeting;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Pass existing audio element */
    preloadedAudioElem: HTMLAudioElement;
    /** Callback to execute when the dialog is closed */
    dialogClose: EventEmitter<void>;
    showPlayDialog: boolean;
    componentDidLoad(): void;
    disconnectedCallback(): void;
    private setupAudio;
    private handleAutoPlayError;
    private handleEvents;
    meetingChanged(meeting: Meeting): Promise<void>;
    private onRtkDialogClose;
    render(): any;
}
