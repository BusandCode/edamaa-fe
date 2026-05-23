type NotificationTypeKey = 'chat' | 'participant_joined' | 'participant_left' | 'polls' | 'participant_joined_waitlist' | 'webinar' | 'recording_started' | 'recording_stopped' | 'tab_sync';
type NotificationSoundsTypeKey = 'chat' | 'participant_joined' | 'participant_left' | 'polls' | 'webinar' | 'participant_joined_waitlist';
export type NotificationType = Record<NotificationTypeKey, boolean>;
export type NotificationSoundsType = Record<NotificationSoundsTypeKey, boolean>;
export type NotificationDuration = Record<NotificationTypeKey, number>;
export interface NotificationConfig {
    notifications: Partial<NotificationType>;
    notification_sounds: Partial<NotificationSoundsType>;
    notification_duration: Partial<NotificationDuration>;
    /**
     * NOTE(callmetarush): This represents the limit of participants
     * that would send a **joined** sound notification, If limit is crossed no
     * new sound notifications will be played for participants joining until the
     * number of participants comes down below the limit.
     */
    participant_joined_sound_notification_limit: number;
    participant_chat_message_sound_notification_limit: number;
}
export type VideoFit = 'cover' | 'contain';
export type Config = Partial<NotificationConfig> & {
    videoFit?: VideoFit;
};
export declare const DEFAULT_NOTIFICATION_DURATION = 2000;
export declare const DEFAULT_NOTIFICATION_CONFIG: Readonly<NotificationConfig>;
export {};
