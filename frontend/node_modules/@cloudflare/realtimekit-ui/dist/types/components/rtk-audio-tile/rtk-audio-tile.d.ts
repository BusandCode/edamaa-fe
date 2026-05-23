import { Meeting, Peer } from '../../types/rtk-client';
import { UIConfig } from '../../types/ui-config';
import { Size } from '../../types/props';
import { RtkI18n, IconPack, States } from '../../exports';
export declare class RtkAudioTile {
    private hark;
    /** Meeting */
    meeting: Meeting;
    /** Config */
    config: UIConfig;
    /** Size */
    size: Size;
    /** States */
    states: States;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Participant object */
    participant: Peer;
    audioEnabled: boolean;
    volume: number;
    connectedCallback(): void;
    disconnectedCallback(): void;
    participantChanged(participant: Peer): void;
    private onAudioUpdate;
    /**
     * Determines the volume from a given MediaStream and updates the components state
     * @param stream A MediaStream with AudioTrack(s) added
     */
    private calcVolume;
    render(): any;
}
