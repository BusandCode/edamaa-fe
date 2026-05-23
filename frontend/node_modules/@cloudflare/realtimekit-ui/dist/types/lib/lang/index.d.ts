import { defaultLanguage } from './default-language';
/**
 * Language dictionary object type
 */
export type LangDict = typeof defaultLanguage;
/**
 * i18n helper method type
 */
export type RtkI18n = (key: keyof LangDict | (string & {})) => string;
/**
 * Creates an i18n instance from a language dictionary/object.
 * @param lang The language dictionary
 * @returns A function which handles i18n
 */
export declare const useLanguage: (lang?: Partial<LangDict | {}>) => RtkI18n;
export { defaultLanguage };
