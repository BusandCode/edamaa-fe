import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Size, States } from '../../types/props';
import { ControlBarVariant } from '../rtk-controlbar-button/rtk-controlbar-button';
/**
 * A button which toggles full screen mode for any
 * existing `rtk-meeting` component in the DOM.
 */
export declare class RtkFullscreenToggle {
    /** States object */
    states: States;
    /** Target Element to fullscreen */
    targetElement: HTMLElement;
    /** Variant */
    variant: ControlBarVariant;
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    fullScreenActive: boolean;
    isFullScreenSupported: boolean;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private onFullScreenchange;
    private toggleFullScreen;
    render(): any;
}
