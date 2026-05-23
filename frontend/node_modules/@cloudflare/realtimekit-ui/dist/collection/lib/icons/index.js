import defaultIconPack from "./default-icon-pack";
export const getIconPack = async (url) => {
    // check for both null/undefined
    if (url == null) {
        return defaultIconPack;
    }
    try {
        const res = await fetch(url);
        if (!res.ok) {
            return defaultIconPack;
        }
        // merge defaultIconPack with the received iconPack so as to
        // fill the missing icons with default ones
        return Object.assign({}, defaultIconPack, await res.json());
    }
    catch (_) {
        return defaultIconPack;
    }
};
export { defaultIconPack };
