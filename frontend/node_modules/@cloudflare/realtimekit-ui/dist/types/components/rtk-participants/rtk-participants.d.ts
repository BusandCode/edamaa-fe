import { IconPack } from '../../lib/icons';
import { Meeting } from '../../types/rtk-client';
import { Size, States } from '../../types/props';
import { UIConfig } from '../../types/ui-config';
import { EventEmitter } from '../../stencil-public-runtime';
import { RtkI18n } from '../../lib/lang';
export type ParticipantsViewMode = 'sidebar';
export type ParticipantsTabId = 'requests' | 'stage-list' | 'viewer-list';
export type Tab = {
    id: ParticipantsTabId;
    name: string | HTMLElement;
};
/**
 * A component which lists all participants, with ability to
 * run privileged actions on each participant according to your permissions.
 */
export declare class RtkParticipants {
    /** Meeting object */
    meeting: Meeting;
    /** States object */
    states: States;
    /** Config */
    config: UIConfig;
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    /** Default section */
    defaultParticipantsTabId: ParticipantsTabId;
    /** Language */
    t: RtkI18n;
    currentParticipantsTabId: ParticipantsTabId;
    tabs: Tab[];
    hasRequests: boolean;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    search: string;
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    currentParticipantsTabIdChanged(): void;
    private updateParticipantCountsInTabs;
    private onSearchInput;
    private shouldShowViewersTab;
    private shouldShowRequestsTab;
    private viewSection;
    render(): any;
}
