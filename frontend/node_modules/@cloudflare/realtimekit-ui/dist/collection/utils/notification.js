/**
 * Send notification which will be displayed in the `<rtk-notifications />` component.
 * @param notification Notification object
 * @param playSound Sound type, if sound type is sent plays that sound with the notification.
 * @returns Return value of emitting the event
 */
export const sendNotification = (notification, playSound = undefined) => {
    if (typeof document === 'undefined')
        return false;
    const event = new CustomEvent('rtkNotification', {
        detail: Object.assign(Object.assign({}, notification), { playSound }),
        composed: true,
    });
    return document.dispatchEvent(event);
};
