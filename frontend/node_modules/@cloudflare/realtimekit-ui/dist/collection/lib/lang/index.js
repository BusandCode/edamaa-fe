import { defaultLanguage } from "./default-language";
/**
 * Creates an i18n instance from a language dictionary/object.
 * @param lang The language dictionary
 * @returns A function which handles i18n
 */
export const useLanguage = (lang = defaultLanguage) => {
    let locale = defaultLanguage;
    if (lang !== defaultLanguage || Object.keys(lang).length > 0) {
        locale = Object.assign({}, defaultLanguage, lang);
    }
    return (key) => {
        var _a;
        return (_a = locale[key]) !== null && _a !== void 0 ? _a : key;
    };
};
export { defaultLanguage };
