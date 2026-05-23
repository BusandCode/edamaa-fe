import { EventEmitter } from '../../stencil-public-runtime';
import { RTKPlugin } from '@cloudflare/realtimekit';
import type { ActiveTabType } from '@cloudflare/realtimekit';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Meeting, Peer } from '../../types/rtk-client';
import { Size, States } from '../../types/props';
import { UIConfig } from '../../types/ui-config';
import { GridLayout } from '../rtk-grid/rtk-grid';
export interface Tab {
    type: ActiveTabType;
    participant?: Peer;
    plugin?: RTKPlugin;
}
export declare class RtkTabBar {
    /** Size */
    size: Size;
    /** Meeting object */
    meeting: Meeting;
    /** States object */
    states: States;
    /** UI Config */
    config: UIConfig;
    /** Grid Layout */
    layout: GridLayout;
    /** Icon Pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Active tab */
    activeTab: Tab;
    /** Tabs */
    tabs: Tab[];
    /** Set active tab */
    tabChange: EventEmitter<Tab>;
    render(): any;
}
