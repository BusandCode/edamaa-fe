import { Size } from '../../exports';
export type IconVariant = 'primary' | 'secondary' | 'danger';
/**
 * An icon component which accepts an svg string and renders it.
 */
export declare class RtkIcon {
    /** Icon */
    icon: string;
    /** Icon variant */
    variant: IconVariant;
    /** Size */
    size: Size;
    render(): any;
}
