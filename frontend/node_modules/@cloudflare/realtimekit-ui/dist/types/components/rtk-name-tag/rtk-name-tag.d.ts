import { Size } from '../../types/props';
import { Meeting, Peer } from '../../types/rtk-client';
import { RtkI18n } from '../../lib/lang';
import { IconPack } from '../../lib/icons';
export type RtkNameTagVariant = 'default' | 'text';
/**
 * A component which shows a participant's name.
 */
export declare class RtkNameTag {
    /** Participant object */
    participant: Peer;
    /** Meeting object */
    meeting: Meeting;
    /** Size */
    size: Size;
    /** Whether it is used in a screen share view */
    isScreenShare: boolean;
    /** Name tag variant */
    variant: RtkNameTagVariant;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    length: number;
    sizeChanged(size: Size): void;
    private formatNameTag;
    render(): any;
}
