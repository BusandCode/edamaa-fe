import { Meeting, Peer } from '../../types/rtk-client';
import { RtkI18n, IconPack, Size, States, UIConfig } from '../../exports';
export declare class RtkAudioGrid {
    /** Meeting */
    meeting: Meeting;
    /** Config */
    config: UIConfig;
    /** States */
    states: States;
    /** Icon Pack */
    iconPack: IconPack;
    /** Size */
    size: Size;
    /** Language */
    t: RtkI18n;
    /** Whether to hide self in the grid */
    hideSelf: boolean;
    activeParticipants: Peer[];
    onStageParticipants: Peer[];
    offStageParticipants: any[];
    host: HTMLRtkAudioGridElement;
    private resizeObserver;
    connectedCallback(): void;
    meetingChanged(meeting?: Meeting): void;
    disconnectedCallback(): void;
    private onParticipantListUpdate;
    private renderGrid;
    render(): any;
}
