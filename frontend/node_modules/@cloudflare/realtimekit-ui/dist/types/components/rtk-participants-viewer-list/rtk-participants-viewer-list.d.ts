import { UIConfig, Size, IconPack, RtkI18n } from '../../exports';
import { Meeting, Peer } from '../../types/rtk-client';
import { ParticipantsViewMode } from '../rtk-participants/rtk-participants';
export declare class RtkParticipantsViewers {
    private participantJoinedListener;
    private participantLeftListener;
    private updateStageViewers;
    /** Meeting object */
    meeting: Meeting;
    /** Config */
    config: UIConfig;
    /** Size */
    size: Size;
    /** Hide Viewer Count Header */
    hideHeader: boolean;
    /** Icon pack */
    iconPack: IconPack;
    /** View mode for participants list */
    view: ParticipantsViewMode;
    /** Search */
    search: string;
    /** Language */
    t: RtkI18n;
    stageViewers: Peer[];
    connectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    searchChanged(search: string): void;
    disconnectedCallback(): void;
    private getViewers;
    private createParticipantNode;
    private shouldShowViewers;
    render(): any;
}
