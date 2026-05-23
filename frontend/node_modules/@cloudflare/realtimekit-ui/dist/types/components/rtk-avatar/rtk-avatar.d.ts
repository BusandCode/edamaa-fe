import { IconPack } from '../../lib/icons';
import { Size } from '../../types/props';
import { Peer, WaitlistedParticipant } from '../../types/rtk-client';
import { RtkI18n } from '../../lib/lang';
export type AvatarVariant = 'circular' | 'square' | 'hexagon';
/**
 * Avatar component which renders a participant's image or their initials.
 */
export declare class RtkAvatar {
    /** Participant object */
    participant: Peer | WaitlistedParticipant | {
        name: string;
        picture: string;
    };
    /** Avatar type */
    variant: AvatarVariant;
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    imageState: 'loading' | 'loaded' | 'errored';
    private getAvatar;
    render(): any;
}
