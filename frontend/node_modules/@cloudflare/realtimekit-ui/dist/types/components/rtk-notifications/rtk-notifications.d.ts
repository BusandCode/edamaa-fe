import { Meeting } from '../../types/rtk-client';
import { Size, Notification, States } from '../../types/props';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { UIConfig } from '../../types/ui-config';
/**
 * A component which handles notifications.
 *
 * You can configure which notifications you want to see and which ones you want to hear.
 * There are also certain limits which you can set as well.
 */
export declare class RtkNotifications {
    private audio;
    private permissions;
    private enabledSounds;
    private participantJoinedListener;
    private participantLeftListener;
    private waitlistedParticipantJoinedListener;
    private waitlistedParticipantLeftListener;
    private chatUpdateListener;
    private pollUpdateListener;
    private deviceUpdateListener;
    private socketConnectionUpdateListener;
    private activeTabUpdateListener;
    private peerStageStatusListener;
    private stageRequestAccepted;
    private stageRequestRejected;
    private newStageRequests;
    private stageStatusUpdateListener;
    private disconnectTimeout;
    host: HTMLRtkNotificationsElement;
    /** Meeting object */
    meeting: Meeting;
    /** States object */
    states: States;
    /** Config object */
    config: UIConfig;
    /** Language */
    t: RtkI18n;
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    notifications: Notification[];
    connectedCallback(): void;
    private clearListeners;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting, oldMeeting?: Meeting): void;
    private addStagePeersListeners;
    private removeStagePeersListeners;
    configChanged(config: UIConfig): void;
    statesChanged(states: States): void;
    apiErrorListener({ detail }: {
        detail: any;
    }): void;
    sendNotificationListener({ detail }: {
        detail: any;
    }): void;
    private onNotification;
    private onRecordingUpdate;
    private add;
    private remove;
    private handleDismiss;
    private canPlayParticipantJoinedSound;
    private canPlayChatSound;
    private canAcceptWaitingRequests;
    paused: boolean;
    render(): any;
}
