export declare const getExtension: (name: string) => string;
/**
 * Formats size in bytes to human readable formats
 * @param size Size in bytes
 * @returns Human readable file size
 */
export declare const getFileSize: (size: number) => string;
/**
 * Extracts the file name from a URL.
 * @param link The URL of the file
 * @param fallback Fallback filename
 * @returns File name
 */
export declare const getFileName: (link: string, fallback?: string) => string;
/**
 * Downloads file from a given URL without leaving the current page
 * @param link URL of the file to download
 * @param options Optional Options for file download - `name` and `fallbackName`
 */
export declare const downloadFile: (link: string, options?: {
    name?: string;
    fallbackName?: string;
}) => Promise<void>;
