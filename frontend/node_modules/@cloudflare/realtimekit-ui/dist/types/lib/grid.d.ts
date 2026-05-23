import { GridSize } from '../components/rtk-grid/rtk-grid';
export type Dimensions = {
    width: number;
    height: number;
};
type UseGridItemDimensionsParams = {
    count: number;
    dimensions: Dimensions;
    aspectRatio: string;
    gap: number;
};
type GridItemData = Dimensions & {
    rows: number;
    cols: number;
};
export declare function useGrid({ dimensions, count, aspectRatio, gap }: UseGridItemDimensionsParams): {
    width: number;
    height: number;
    getPosition: (index: number) => {
        top: number;
        left: number;
    };
};
export declare function useGridItemDimensions({ count, dimensions, aspectRatio, gap, }: UseGridItemDimensionsParams): GridItemData;
export declare function useGridPositioning({ parentDimensions, dimensions, rows, cols, count, gap, }: {
    parentDimensions: Dimensions;
    dimensions: Dimensions;
    rows: number;
    cols: number;
    count: number;
    gap: number;
}): (index: number) => {
    top: number;
    left: number;
};
/**
 * Parses the Aspect Ratio value
 * @param ratio The aspect ratio in the format of `16:9` where `width:height`
 * @returns The parsed value of aspect ratio
 */
export declare const getAspectRatio: (ratio: string) => number;
export declare const defaultGridSize: GridSize;
export {};
