import { EmojiMetaData } from '../types/props';
/**
 * fetches the latest emoji list from CDN
 * @returns list of emojis
 */
export declare const fetchEmojis: () => Promise<Record<string, EmojiMetaData>>;
