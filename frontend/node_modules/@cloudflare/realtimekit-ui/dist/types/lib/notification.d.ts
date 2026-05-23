import { Meeting } from '../types/rtk-client';
declare const SOUNDS: {
    joined: string;
    left: string;
    message: string;
};
export type Sound = keyof typeof SOUNDS;
/**
 * Handles notification sounds in a meeting
 */
export default class RTKNotificationsAudio {
    private audio;
    private playing;
    private meeting;
    constructor(meeting: Meeting);
    play(sound: Sound, duration?: number): void;
    setDevice(id: string): Promise<void>;
}
export {};
