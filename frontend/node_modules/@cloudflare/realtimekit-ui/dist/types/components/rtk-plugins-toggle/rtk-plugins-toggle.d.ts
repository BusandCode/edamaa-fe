import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Meeting } from '../../types/rtk-client';
import { Size, States } from '../../types/props';
import { ControlBarVariant } from '../rtk-controlbar-button/rtk-controlbar-button';
/**
 * A button which toggles visibility of plugins.
 *
 * When clicked it emits a `rtkStateUpdate` event with the data:
 *
 * ```ts
 * { activeSidebar: boolean; sidebar: 'plugins' }
 * ```
 */
export declare class RtkPluginsToggle {
    /** Variant */
    variant: ControlBarVariant;
    /** Meeting object */
    meeting: Meeting;
    /** States object */
    states: States;
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    pluginsActive: boolean;
    canViewPlugins: boolean;
    disconnectedCallback(): void;
    connectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    statesChanged(states?: States): void;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    private togglePlugins;
    private updateCanView;
    handlePluginsActiveChange(): void;
    private buttonEl;
    render(): any;
}
