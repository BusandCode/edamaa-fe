import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Meeting, Peer } from '../../types/rtk-client';
import { Size, States } from '../../types/props';
/**
 * A component which plays a participant's screenshared video.
 *
 * It also allows for placement of other components similar to `rtk-participant-tile`.
 *
 * This component will not render anything if the participant hasn't start screensharing.
 */
export declare class RtkScreenshareView {
    private videoEl;
    private screenShareListener;
    private fullScreenListener;
    private participantScreenshareUpdate;
    host: HTMLRtkScreenshareViewElement;
    /** Hide full screen button */
    hideFullScreenButton: boolean;
    /** Position of name tag */
    nameTagPosition: 'bottom-left' | 'bottom-right' | 'bottom-center' | 'top-left' | 'top-right' | 'top-center';
    /** Participant object */
    participant: Peer;
    /** Meeting object */
    meeting: Meeting;
    /** Variant */
    variant: 'solid' | 'gradient';
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    videoExpanded: boolean;
    screenShareEnabled: boolean;
    isFullScreen: boolean;
    remoteControlInfo: string;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    /** Emits when video playback happens successfully */
    play: EventEmitter<{
        participant: Peer;
        screenshareParticipant: Peer;
    }>;
    connectedCallback(): void;
    componentDidLoad(): void;
    disconnectedCallback(): void;
    participantChanged(participant: Peer): void;
    private toggleFullScreen;
    render(): any;
}
