import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Meeting, Peer } from '../../types/rtk-client';
import { Size, States } from '../../types/props';
import { UIConfig } from '../../types/ui-config';
/**
 * A component which plays a participants video and allows for placement
 * of components like `rtk-name-tag`, `rtk-audio-visualizer` or any other component.
 */
export declare class RtkParticipantTile {
    private videoEl;
    private playTimeout;
    isPinned: boolean;
    mediaConnectionError: boolean;
    /** Position of name tag */
    nameTagPosition: 'bottom-left' | 'bottom-right' | 'bottom-center' | 'top-left' | 'top-right' | 'top-center';
    /** Whether tile is used for preview */
    isPreview: boolean;
    /** Participant object */
    participant: Peer;
    /** Meeting object */
    meeting: Meeting;
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
    /** Event triggered when tile is loaded */
    tileLoad: EventEmitter<{
        participant: Peer;
        videoElement: HTMLVideoElement;
    }>;
    /** Event triggered when tile is unloaded */
    tileUnload: EventEmitter<Peer>;
    private onVideoRef;
    connectedCallback(): void;
    constructor();
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    participantsChanged(participant: Peer): void;
    private mediaConnectionUpdateListener;
    private onPinned;
    private isSelf;
    private isMirrored;
    private onPause;
    private onPlaying;
    render(): any;
}
