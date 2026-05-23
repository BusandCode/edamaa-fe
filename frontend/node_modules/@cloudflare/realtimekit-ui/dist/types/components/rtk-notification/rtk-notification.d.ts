import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Notification, Size } from '../../types/props';
/**
 * A component which shows a notification.
 *
 * You need to remove the element after you receive the
 * `rtkNotificationDismiss` event.
 */
export declare class RtkNotification {
    /** Message */
    notification: Notification;
    /** Stops timeout when true */
    paused: boolean;
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Dismiss event */
    dismiss: EventEmitter<string>;
    imageState: 'loading' | 'loaded' | 'errored';
    connectedCallback(): void;
    private timeout;
    pausedChanged(paused: boolean): void;
    notificationChanged(notification: Notification): void;
    render(): any;
}
