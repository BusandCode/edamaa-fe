import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Meeting } from '../../types/rtk-client';
import { Size, States } from '../../types/props';
import { ControlBarVariant } from '../rtk-controlbar-button/rtk-controlbar-button';
/**
 * A button which toggles visibility of polls.
 *
 * You need to pass the `meeting` object to it to see the unread polls count badge.
 *
 * When clicked it emits a `rtkStateUpdate` event with the data:
 *
 * ```ts
 * { activeSidebar: boolean; sidebar: 'polls' }
 * ```
 */
export declare class RtkPollsToggle {
    /** Variant */
    variant: ControlBarVariant;
    /** Meeting object */
    meeting: Meeting;
    /** States object */
    states: States;
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    pollsActive: boolean;
    unreadPollsCount: number;
    canViewPolls: boolean;
    private onPollsUpdate;
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    statesChanged(states?: States): void;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    private togglePollsTab;
    private updateCanView;
    handlePollsActiveChange(): void;
    private buttonEl;
    render(): any;
}
