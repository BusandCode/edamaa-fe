import defaultIconPack from './default-icon-pack';
/**
 * Icon Pack object type.
 * - Oject key denotes name of icon
 * - Object value stores the SVG string
 */
export type IconPack = typeof defaultIconPack;
export declare const getIconPack: (url: string) => Promise<IconPack>;
export { defaultIconPack };
