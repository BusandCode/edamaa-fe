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
export default gracefulStorage;
