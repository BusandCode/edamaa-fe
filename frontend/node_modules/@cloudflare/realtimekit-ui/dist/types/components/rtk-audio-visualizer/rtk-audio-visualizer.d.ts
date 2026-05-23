import { Peer } from '../../types/rtk-client';
import { IconPack } from '../../lib/icons';
import { Size } from '../../types/props';
import { RtkI18n } from '../../lib/lang';
export type AudioVisualizerVariant = 'bars';
/**
 * An audio visualizer component which visualizes a participants audio.
 *
 * Commonly used inside `rtk-name-tag`.
 */
export declare class RtkAudioVisualizer {
    private visualizer;
    private hark;
    private audioUpdateListener;
    private screenShareUpdateListener;
    /** Variant */
    variant: AudioVisualizerVariant;
    /** Participant object */
    participant: Peer;
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Hide the visualizer if audio is muted */
    hideMuted: boolean;
    /** Audio visualizer for screensharing, it will use screenShareTracks.audio instead of audioTrack */
    isScreenShare: boolean;
    audioEnabled: boolean;
    volume: number;
    connectedCallback(): void;
    componentDidLoad(): void;
    disconnectedCallback(): void;
    participantChanged(participant: Peer): void;
    /**
     * Determines the volume from a given MediaStream and updates the components state
     * @param stream A MediaStream with AudioTrack(s) added
     */
    private calcVolume;
    render(): any;
}
