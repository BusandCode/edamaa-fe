import { EventEmitter } from '../../stencil-public-runtime';
import { Meeting } from '../../types/rtk-client';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Size, States } from '../../types/props';
export type DebuggerTab = 'audio' | 'video' | 'screenshare' | 'system';
/**
 * A troubleshooting component to identify and fix any issues in the meeting.
 */
export declare class RtkDebugger {
    private keyPressListener;
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
    activeTab: DebuggerTab;
    isMobileMainVisible: boolean;
    progress: number;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    connectedCallback(): void;
    disconnectedCallback(): void;
    progressUpdate(event: CustomEvent<number>): void;
    private changeTab;
    private close;
    private getActiveTab;
    render(): any;
}
