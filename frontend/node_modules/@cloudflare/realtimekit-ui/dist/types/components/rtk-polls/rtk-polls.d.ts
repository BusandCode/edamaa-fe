import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Meeting } from '../../types/rtk-client';
import { Size, Poll } from '../../types/props';
import { UIConfig } from '../../types/ui-config';
import { RTKPermissionsPreset } from '@cloudflare/realtimekit';
/**
 * A component which lists all available plugins a user can access with
 * the ability to enable or disable them as per their permissions.
 */
export declare class RtkPolls {
    private onCreate;
    private onVote;
    private pollEl;
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
    /** Create State */
    create: boolean;
    /** Polls */
    polls: Poll[];
    permissions: RTKPermissionsPreset;
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    private toggleCreateState;
    private onPollsUpdate;
    private onUpdatePermissions;
    componentDidRender(): void;
    render(): any;
}
