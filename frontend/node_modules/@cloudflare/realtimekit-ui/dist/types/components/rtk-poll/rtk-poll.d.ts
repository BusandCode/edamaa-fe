import { RTKPermissionsPreset } from '@cloudflare/realtimekit';
import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Poll } from '../../types/props';
/**
 * A poll component.
 *
 * Shows a poll where a user can vote.
 */
export declare class RtkPolls {
    /** Poll */
    poll: Poll;
    /** Self ID */
    self: string;
    /** Permissions Object */
    permissions: RTKPermissionsPreset;
    /** Event which is emitted when a poll is voted on */
    onVote: EventEmitter<{
        id: string;
        index: number;
    }>;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    private MAX_VOTES_RENDER;
    private vote;
    render(): any;
}
