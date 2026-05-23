import { Meeting } from '../types/rtk-client';
/**
 * Handles audio from participants in a meeting
 */
export default class RTKAudio {
    private audio;
    private audioStream;
    private meeting;
    private audioTracks;
    private logger;
    private _onError;
    constructor(meeting: Meeting, audio?: HTMLAudioElement);
    addTrack(id: string, track: MediaStreamTrack): void;
    removeTrack(id: string): void;
    play(): Promise<void>;
    setDevice(id: string): Promise<void>;
    onError(onError: () => void): void;
}
