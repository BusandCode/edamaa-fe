import { disableSettingSinkId } from "../utils/flags";
/**
 * Handles audio from participants in a meeting
 */
export default class RTKAudio {
    constructor(meeting, audio) {
        this.meeting = meeting;
        this.audio = audio !== null && audio !== void 0 ? audio : document.createElement('audio');
        this.audio.autoplay = true;
        this.logger = meeting.__internals__.logger;
        this.audioStream = new MediaStream();
        this.audio.srcObject = this.audioStream;
        this.audioTracks = [];
    }
    addTrack(id, track) {
        if (!this.audioTracks.some((a) => a.id === id)) {
            this.audioTracks.push({ id, track });
            this.audioStream.addTrack(track);
            this.play();
        }
    }
    removeTrack(id) {
        const track = this.audioTracks.find((a) => a.id === id);
        if (track != null) {
            this.audioStream.removeTrack(track.track);
            this.audioTracks = this.audioTracks.filter((a) => a.id !== id);
        }
    }
    async play() {
        var _a;
        this.audio.srcObject = this.audioStream;
        await ((_a = this.audio.play()) === null || _a === void 0 ? void 0 : _a.catch((err) => {
            if (err.name === 'NotAllowedError') {
                if (this._onError != null) {
                    this._onError();
                }
            }
            else if (err.name !== 'AbortError') {
                this.logger.error('[rtk-audio] play() error\n', err);
            }
        }));
    }
    async setDevice(id) {
        var _a, _b, _c;
        if (disableSettingSinkId(this.meeting))
            return;
        await ((_c = (_b = (_a = this.audio).setSinkId) === null || _b === void 0 ? void 0 : _b.call(_a, id)) === null || _c === void 0 ? void 0 : _c.catch((err) => {
            this.logger.error('[rtk-audio] setSinkId() error\n', err);
        }));
    }
    onError(onError) {
        this._onError = onError;
    }
}
