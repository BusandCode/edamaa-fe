export declare const BRAND_SHADE_REDUCER: number[];
export declare const BACKGROUND_SHADE_REDUCER: number[];
type RGB = [number, number, number];
type HSL = [number, number, number];
export declare function hexToRGB(h: string): RGB;
/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @returns {Array}           The RGB representation
 */
export declare const hslToRgb: (h: number, s: number, l: number) => RGB;
/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   {number}  r       The red color value
 * @param   {number}  g       The green color value
 * @param   {number}  b       The blue color value
 * @returns {Array}           The HSL representation
 */
export declare const rgbToHsl: (r: number, g: number, b: number) => HSL;
export declare const rgbToHex: (r: number, g: number, b: number) => string;
/**
 * Generate shades from a single base hex color code.
 *
 * `weight` is contained in the set [0, 1].
 *
 * @param   {string} baseHexCode The base hex code to use to generate the other shades
 * @param   {number} weight The weight applied when calculating each shade.
 * @param   {number[]} reducer The reducer array which tells how to calculate the shades
 * @returns {string[]} The generated hex shades
 */
export declare const generateShades: (baseHexCode: string, reducer?: number[], weight?: number) => string[];
export declare const isValidHexColor: (color: string) => boolean;
export declare const getBrandColors: (shade: string) => {
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
};
/**
 * Generates new background colors which are compatible with older preset color values
 * @param shade The hex color code
 * @returns Background color tokens
 */
export declare const getBackgroundColorsOld: (shade: string) => {
    1000: string;
    900: string;
    800: string;
    700: string;
    600: string;
};
export declare const getBackgroundColors: (shade: string) => {
    1000?: string;
    900?: string;
    800?: string;
    700?: string;
    600?: string;
};
export {};
