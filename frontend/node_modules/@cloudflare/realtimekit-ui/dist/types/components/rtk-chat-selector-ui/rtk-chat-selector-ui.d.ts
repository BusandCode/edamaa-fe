import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack } from '../../exports';
import { RtkI18n } from '../../lib/lang';
import { Peer } from '../../types/rtk-client';
export type ChatGroup = Pick<Peer, 'userId' | 'name'>;
export type ChatGroupChangedType = ChatGroup | string;
export declare class RtkChatSelectorUi {
    /** Self User ID */
    selfUserId: string;
    /** Selected participant */
    selectedGroupId: string;
    /** Unread counts */
    unreadCounts: Record<string, number>;
    /** Participants */
    groups: ChatGroup[];
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    showParticipantsPanel: boolean;
    query: string;
    /** Event emitted when chat scope is changed */
    groupChanged: EventEmitter<ChatGroupChangedType>;
    private toggleParticipants;
    private onScopeClick;
    private getGroups;
    private getName;
    render(): any;
}
