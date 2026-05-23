import type { LivestreamState } from '@cloudflare/realtimekit';
import { EventEmitter } from '../../stencil-public-runtime';
import { Size, RtkI18n, IconPack } from '../../exports';
import { Meeting } from '../../types/rtk-client';
import { PlayerEventType, PlayerState } from '../../utils/livestream';
export declare class RtkLivestreamPlayer {
    private videoRef;
    private videoContainerRef;
    el: HTMLRtkLivestreamPlayerElement;
    private hls;
    private statsIntervalTimer;
    /** Meeting object */
    meeting: Meeting;
    /** Size */
    size: Size;
    /** Language */
    t: RtkI18n;
    /** Icon pack */
    iconPack: IconPack;
    playbackUrl: string;
    isSupported: boolean;
    playerState: PlayerState | PlayerEventType;
    livestreamState: LivestreamState;
    playerError: any;
    livestreamId: string;
    audioPlaybackError: boolean;
    qualityLevels: Array<{
        level: number;
        resolution: string;
    }>;
    selectedQuality: number;
    currentTime: number;
    duration: number;
    hideControls: boolean;
    isDragging: boolean;
    seekPosition: number;
    isSeeking: boolean;
    private hideControlsTimeout;
    private seekingTimeout;
    /**
     * Emit API error events
     */
    apiError: EventEmitter<{
        trace: string;
        message: string;
    }>;
    private livestreamUpdateListener;
    private updateProgress;
    private updateHlsStatsPeriodically;
    private fastForwardToLatest;
    private updateLivestreamId;
    private conditionallyStartLivestreamViewer;
    private togglePlay;
    private changeQuality;
    private cleanupPlayer;
    private onMouseMovePlayer;
    private seekToPosition;
    private onSeekbarMouseDown;
    private onSeekbarMouseMove;
    private onSeekbarMouseUp;
    private onSeekbarClick;
    private updateSeekPosition;
    private getSeekbarProgress;
    private getLoadingState;
    private getErrorState;
    private initialiseAndPlayStream;
    connectedCallback(): Promise<void>;
    disconnectedCallback(): void;
    meetingChanged(meeting: any): void;
    render(): any;
}
