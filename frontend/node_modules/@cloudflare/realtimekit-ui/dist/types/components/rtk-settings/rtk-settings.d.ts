import { EventEmitter } from '../../stencil-public-runtime';
import { Meeting } from '../../types/rtk-client';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Size, States } from '../../types/props';
type SettingsTab = 'audio' | 'video' | 'connection';
/**
 * A settings component to see and change your audio/video devices
 * as well as see your connection quality.
 */
export declare class RtkSettings {
    private poorConnectionListener;
    private keyPressListener;
    private stageStatusListener;
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
    activeTab: SettingsTab;
    isMobileMainVisible: boolean;
    networkStatus: 'good' | 'poor' | 'poorest';
    canProduceVideo: boolean;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    private changeTab;
    private close;
    render(): any;
}
export {};
