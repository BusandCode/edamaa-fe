import { IconPack } from '../../lib/icons';
import { Meeting, Peer } from '../../types/rtk-client';
import { Size } from '../../types/props';
import { UIConfig } from '../../types/ui-config';
import { RtkI18n } from '../../lib/lang';
import { ParticipantsViewMode } from '../rtk-participants/rtk-participants';
import { States } from '../../exports';
/**
 * A component which lists all participants, with ability to
 * run privileged actions on each participant according to your permissions.
 */
export declare class RtkParticipants {
    private participantJoinedListener;
    private participantLeftListener;
    /** Meeting object */
    meeting: Meeting;
    /** Meeting object */
    states: States;
    /** Config */
    config: UIConfig;
    /** Size */
    size: Size;
    /** Hide Stage Participants Count Header */
    hideHeader: boolean;
    /** Icon pack */
    iconPack: IconPack;
    /** View mode for participants list */
    view: ParticipantsViewMode;
    /** Language */
    t: RtkI18n;
    /** Search */
    search: string;
    participants: Peer[];
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    searchChanged(search: string): void;
    private createParticipantNode;
    private getParticipants;
    private updateStageList;
    render(): any;
}
