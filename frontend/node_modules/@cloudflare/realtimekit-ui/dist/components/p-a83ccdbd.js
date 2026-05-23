const handler = {
    get: (target, name, receiver) => (...args) => {
        try {
            return Reflect.get(target, name, receiver).apply(target, args);
        }
        catch (_a) {
            return null;
        }
    },
};
let gracefulStorage;
try {
    gracefulStorage = new Proxy(localStorage, handler);
}
catch (_a) {
    gracefulStorage = new Proxy({}, handler);
}
const gracefulStorage$1 = gracefulStorage;

const KEY = 'rtk-prefs';
const setPreference = (key, value) => {
    const data = JSON.parse(gracefulStorage$1.getItem(KEY) || '{}');
    data[key] = JSON.stringify(value);
    gracefulStorage$1.setItem('rtk-prefs', JSON.stringify(data));
};
const getPreference = (key) => {
    const data = JSON.parse(gracefulStorage$1.getItem(KEY) || '{}');
    return data[key];
};
const getUserPreferences = () => {
    const prefs = JSON.parse(gracefulStorage$1.getItem(KEY) || '{}');
    const mirrorVideo = prefs['mirror-video'] ? prefs['mirror-video'] === 'true' : true;
    const muteNotificationSounds = prefs['mute-notification-sounds']
        ? prefs['mute-notification-sounds'] === 'true'
        : false;
    return { mirrorVideo, muteNotificationSounds };
};
const chatUnreadTimestamps = {};

export { gracefulStorage$1 as a, getPreference as b, chatUnreadTimestamps as c, getUserPreferences as g, setPreference as s };
