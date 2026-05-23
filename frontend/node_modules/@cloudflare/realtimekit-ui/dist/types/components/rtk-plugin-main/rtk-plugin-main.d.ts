import { IconPack } from '../../lib/icons';
import { RTKPlugin } from '@cloudflare/realtimekit';
import { Meeting } from '../../types/rtk-client';
import { RtkI18n } from '../../lib/lang';
/**
 * A component which loads a plugin.
 */
export declare class RtkPluginMain {
    private iframeEl;
    private toggleViewModeListener;
    /** Meeting */
    meeting: Meeting;
    /** Plugin */
    plugin: RTKPlugin;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    canClosePlugin: boolean;
    viewModeEnabled: boolean;
    componentDidLoad(): void;
    private onIframeRef;
    meetingChanged(meeting: Meeting): void;
    pluginChanged(plugin: RTKPlugin): void;
    disconnectedCallback(): void;
    private canInteractWithPlugin;
    render(): any;
}
