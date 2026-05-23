import { EventEmitter } from '../../stencil-public-runtime';
import { Meeting } from '../../types/rtk-client';
import { Size, States } from '../../types/props';
import { UIConfig } from '../../types/ui-config';
import { IconPack } from '../../lib/icons';
import { RTKPlugin } from '@cloudflare/realtimekit';
import { RtkI18n } from '../../lib/lang';
/**
 * A component which lists all available plugins from their preset,
 * and ability to enable or disable plugins.
 */
export declare class RtkPlugins {
    private updateActivePlugins;
    /** Meeting object */
    meeting: Meeting;
    /** Config */
    config: UIConfig;
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    plugins: RTKPlugin[];
    canStartPlugins: boolean;
    canClosePlugins: boolean;
    activatedPluginsId: string[];
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    private close;
    render(): any;
}
