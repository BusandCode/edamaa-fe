import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Meeting, Peer } from '../../types/rtk-client';
import { States, UIConfig } from '../../exports';
export type ParticipantViewMode = 'sidebar';
/**
 * A participant entry component used inside `rtk-participants` which shows data like:
 * name, picture and media device status.
 *
 * You can perform privileged actions on the participant too.
 */
export declare class RtkParticipant {
    private audioUpdateListener;
    private videoUpdateListener;
    private pinnedListener;
    private toggleTileListener;
    private stageListener;
    host: HTMLRtkParticipantElement;
    /** Meeting object */
    meeting: Meeting;
    /** States */
    states: States;
    /** Show participant summary */
    view: ParticipantViewMode;
    /** Participant object */
    participant: Peer;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Config object */
    config: UIConfig;
    /**
     * Emit notifications
     */
    rtkSendNotification: EventEmitter<{
        trace: string;
        message: string;
    }>;
    audioEnabled: boolean;
    videoEnabled: boolean;
    isPinned: boolean;
    isHidden: boolean;
    isOnStage: boolean;
    canDisableParticipantAudio: boolean;
    canDisableParticipantVideo: boolean;
    canKickParticipant: boolean;
    canPinParticipant: boolean;
    canAllowParticipantOnStage: boolean;
    menuOpen: boolean;
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    participantChanged(participant: Peer): void;
    private permissionsUpdateListener;
    private inviteToStageToggle;
    private handleOutsideClick;
    private update;
    private onMenuToggle;
    render(): any;
}
