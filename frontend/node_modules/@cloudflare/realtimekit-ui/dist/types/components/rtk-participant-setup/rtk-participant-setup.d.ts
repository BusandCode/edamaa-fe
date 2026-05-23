import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Peer } from '../../types/rtk-client';
import { Size, States } from '../../types/props';
import { UIConfig } from '../../types/ui-config';
export type VideoState = Pick<Peer, 'videoEnabled' | 'videoTrack'>;
export declare class RtkParticipantSetup {
    private videoEl;
    videoState: VideoState;
    isPinned: boolean;
    /** Position of name tag */
    nameTagPosition: 'bottom-left' | 'bottom-right' | 'bottom-center' | 'top-left' | 'top-right' | 'top-center';
    /** Whether tile is used for preview */
    isPreview: boolean;
    /** Participant object */
    participant: Peer;
    /** States object */
    states: States;
    /** Config object */
    config: UIConfig;
    /** Variant */
    variant: 'solid' | 'gradient';
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    connectedCallback(): void;
    componentDidLoad(): void;
    disconnectedCallback(): void;
    participantsChanged(participant: Peer): Promise<void>;
    videoStateChanged(videoState: VideoState): void;
    private onVideoUpdate;
    private isMirrored;
    render(): any;
}
