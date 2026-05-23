/**
 * Can view the livestream
 */
export const isLiveStreamViewer = (meeting) => {
    if (!showLivestream(meeting))
        return false;
    return meeting.meta.viewType === 'LIVESTREAM' && meeting.stage.status !== 'ON_STAGE';
};
/**
 * Can start/stop the livestream
 */
export const isLiveStreamHost = (meeting) => {
    var _a;
    if (!showLivestream(meeting))
        return false;
    return meeting.meta.viewType === 'LIVESTREAM' && ((_a = meeting === null || meeting === void 0 ? void 0 : meeting.self) === null || _a === void 0 ? void 0 : _a.permissions.canLivestream);
};
export const showLivestream = (meeting) => {
    return meeting === null || meeting === void 0 ? void 0 : meeting.livestream;
};
export var PlayerState;
(function (PlayerState) {
    PlayerState["BUFFERING"] = "Buffering";
    PlayerState["ENDED"] = "Ended";
    PlayerState["IDLE"] = "Idle";
    PlayerState["PAUSED"] = "Paused";
    PlayerState["PLAYING"] = "Playing";
    PlayerState["READY"] = "Ready";
})(PlayerState || (PlayerState = {}));
export var PlayerEventType;
(function (PlayerEventType) {
    PlayerEventType["INITIALIZED"] = "PlayerInitialized";
    PlayerEventType["QUALITY_CHANGED"] = "PlayerQualityChanged";
    PlayerEventType["DURATION_CHANGED"] = "PlayerDurationChanged";
    PlayerEventType["VOLUME_CHANGED"] = "PlayerVolumeChanged";
    PlayerEventType["MUTED_CHANGED"] = "PlayerMutedChanged";
    PlayerEventType["PLAYBACK_RATE_CHANGED"] = "PlayerPlaybackRateChanged";
    PlayerEventType["REBUFFERING"] = "PlayerRebuffering";
    PlayerEventType["AUDIO_BLOCKED"] = "PlayerAudioBlocked";
    PlayerEventType["PLAYBACK_BLOCKED"] = "PlayerPlaybackBlocked";
    PlayerEventType["ERROR"] = "PlayerError";
    PlayerEventType["RECOVERABLE_ERROR"] = "PlayerRecoverableError";
    PlayerEventType["ANALYTICS_EVENT"] = "PlayerAnalyticsEvent";
    PlayerEventType["TIME_UPDATE"] = "PlayerTimeUpdate";
    PlayerEventType["BUFFER_UPDATE"] = "PlayerBufferUpdate";
    PlayerEventType["SEEK_COMPLETED"] = "PlayerSeekCompleted";
    PlayerEventType["SESSION_DATA"] = "PlayerSessionData";
    PlayerEventType["STATE_CHANGED"] = "PlayerStateChanged";
    PlayerEventType["WORKER_ERROR"] = "PlayerWorkerError";
    PlayerEventType["METADATA"] = "PlayerMetadata";
    PlayerEventType["TEXT_CUE"] = "PlayerTextCue";
    PlayerEventType["TEXT_METADATA_CUE"] = "PlayerTextMetadataCue";
    PlayerEventType["AD_CUE"] = "PlayerAdCue";
    PlayerEventType["STREAM_SOURCE_CUE"] = "PlayerStreamSourceCue";
    PlayerEventType["NETWORK_UNAVAILABLE"] = "PlayerNetworkUnavailable";
    PlayerEventType["SEGMENT_DISCONTINUITY"] = "PlayerSegmentDiscontinuity";
    PlayerEventType["SEGMENT_METADATA"] = "PlayerSegmentMetadata";
    PlayerEventType["PLAYER_METADATA"] = "PlayerMetadata";
})(PlayerEventType || (PlayerEventType = {}));
/**
 * NOTE(callmetarush): For some reason PlayerMetadata is not in type but spams events like crazy
 */
export const awsIvsPlayerEventsToIgnore = [
    PlayerEventType.TIME_UPDATE,
    PlayerEventType.BUFFER_UPDATE,
    PlayerEventType.TEXT_METADATA_CUE,
    PlayerEventType.PLAYER_METADATA,
];
export const isIvsPlayerCallStatsEvent = [
    // CallStats Major Events
    PlayerEventType.REBUFFERING, // no payload
    PlayerEventType.AUDIO_BLOCKED, // no payload
    PlayerEventType.PLAYBACK_BLOCKED, // no payload
    PlayerEventType.ERROR,
    PlayerEventType.RECOVERABLE_ERROR,
    PlayerEventType.WORKER_ERROR,
    // According to docs it says:
    // "Indicates that a playback unavailable event occurred."
    //
    // So I am taking a guess this can occcur
    // even when a viewer is online
    PlayerEventType.NETWORK_UNAVAILABLE, // no payload
    // CallStats Minor Events
    PlayerEventType.ANALYTICS_EVENT,
    PlayerEventType.PLAYBACK_RATE_CHANGED,
    PlayerEventType.QUALITY_CHANGED,
    PlayerEventType.INITIALIZED, // no payload
];
export function getLivestreamViewerAllowedQualityLevels({ meeting, hlsLevels, }) {
    let allowedQualities = meeting.self.config.livestreamViewerQualities || [];
    if (!allowedQualities.length) {
        return { autoLevelChangeAllowed: true, levels: hlsLevels };
    }
    // Filter allowed qualities
    const desiredLevels = hlsLevels.filter((level) => allowedQualities.includes(level.height));
    if (!desiredLevels.length) {
        return { autoLevelChangeAllowed: true, levels: hlsLevels };
    }
    return { autoLevelChangeAllowed: false, levels: desiredLevels };
}
