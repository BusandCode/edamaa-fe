var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m")
        throw new TypeError("Private method is not writable");
    if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f)
        throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s)
        if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var _BreakoutRoomsManager_instances, _BreakoutRoomsManager_hasLocalChanges, _BreakoutRoomsManager_state, _BreakoutRoomsManager_participantsNewMeetingMap, _BreakoutRoomsManager_participantsOldMeetingMap, _BreakoutRoomsManager_meetingParticipantsMap, _BreakoutRoomsManager_allParticipantsMap, _BreakoutRoomsManager_allMeetingsMap, _BreakoutRoomsManager_meetingsToUpdate, _BreakoutRoomsManager_meetingsToDelete, _BreakoutRoomsManager_init, _BreakoutRoomsManager_addNewMeetingToState, _BreakoutRoomsManager_addNewParticipantToState, _BreakoutRoomsManager_replaceDraftMeetingIds, _BreakoutRoomsManager_getMeetingParticipants;
import { createDraftRoom, isDraftRoom, participantIdentifier, splitCollection, } from "./breakout-rooms";
class BreakoutRoomsManager {
    constructor() {
        _BreakoutRoomsManager_instances.add(this);
        _BreakoutRoomsManager_hasLocalChanges.set(this, false);
        _BreakoutRoomsManager_state.set(this, void 0);
        _BreakoutRoomsManager_participantsNewMeetingMap.set(this, void 0);
        _BreakoutRoomsManager_participantsOldMeetingMap.set(this, void 0);
        _BreakoutRoomsManager_meetingParticipantsMap.set(this, void 0);
        _BreakoutRoomsManager_allParticipantsMap.set(this, void 0);
        _BreakoutRoomsManager_allMeetingsMap.set(this, void 0);
        _BreakoutRoomsManager_meetingsToUpdate.set(this, void 0);
        _BreakoutRoomsManager_meetingsToDelete.set(this, void 0);
    }
    get hasLocalChanges() {
        return __classPrivateFieldGet(this, _BreakoutRoomsManager_hasLocalChanges, "f");
    }
    get currentState() {
        let parentMeeting;
        let meetings = [];
        Array.from(__classPrivateFieldGet(this, _BreakoutRoomsManager_meetingParticipantsMap, "f").keys()).forEach((meetingId) => {
            const meeting = __classPrivateFieldGet(this, _BreakoutRoomsManager_allMeetingsMap, "f").get(meetingId);
            if (meeting.isParent) {
                parentMeeting = Object.assign(Object.assign({}, meeting), { participants: __classPrivateFieldGet(this, _BreakoutRoomsManager_instances, "m", _BreakoutRoomsManager_getMeetingParticipants).call(this, meetingId) });
            }
            else {
                meetings.push(Object.assign(Object.assign({}, meeting), { participants: __classPrivateFieldGet(this, _BreakoutRoomsManager_instances, "m", _BreakoutRoomsManager_getMeetingParticipants).call(this, meetingId) }));
            }
        });
        return {
            parentMeeting,
            meetings,
        };
    }
    get allConnectedMeetings() {
        return this.currentState.meetings.sort((a, b) => a.title.localeCompare(b.title));
    }
    get allParticipants() {
        return Array.from(__classPrivateFieldGet(this, _BreakoutRoomsManager_allParticipantsMap, "f").values());
    }
    get unassignedParticipants() {
        return __classPrivateFieldGet(this, _BreakoutRoomsManager_instances, "m", _BreakoutRoomsManager_getMeetingParticipants).call(this, __classPrivateFieldGet(this, _BreakoutRoomsManager_state, "f").parentMeeting.id);
    }
    /**
     * get participants of a meeting
     */
    getParticipantsForMeeting(meetingId) {
        return __classPrivateFieldGet(this, _BreakoutRoomsManager_instances, "m", _BreakoutRoomsManager_getMeetingParticipants).call(this, meetingId);
    }
    /**
     * add a new connected meeting
     */
    addNewMeeting() {
        __classPrivateFieldSet(this, _BreakoutRoomsManager_hasLocalChanges, true, "f");
        const _a = createDraftRoom(), { participants } = _a, meeting = __rest(_a, ["participants"]);
        __classPrivateFieldGet(this, _BreakoutRoomsManager_instances, "m", _BreakoutRoomsManager_addNewMeetingToState).call(this, Object.assign(Object.assign({}, meeting), { isParent: false }));
        return meeting;
    }
    /**
     * add multiple new connected meetings
     */
    addNewMeetings(count) {
        return Array.from({ length: count }).map(() => this.addNewMeeting());
    }
    /**
     * update a meeting's title
     */
    updateMeetingTitle(meetingId, newTitle) {
        __classPrivateFieldGet(this, _BreakoutRoomsManager_allMeetingsMap, "f").get(meetingId).title = newTitle;
        if (!isDraftRoom(meetingId)) {
            __classPrivateFieldGet(this, _BreakoutRoomsManager_meetingsToUpdate, "f").add(meetingId);
        }
    }
    /**
     * deleteMeeting
     */
    deleteMeeting(meetingId) {
        __classPrivateFieldSet(this, _BreakoutRoomsManager_hasLocalChanges, true, "f");
        const meeting = __classPrivateFieldGet(this, _BreakoutRoomsManager_allMeetingsMap, "f").get(meetingId);
        const participants = __classPrivateFieldGet(this, _BreakoutRoomsManager_instances, "m", _BreakoutRoomsManager_getMeetingParticipants).call(this, meeting.id).map(participantIdentifier);
        this.assignParticipantsToMeeting(participants, __classPrivateFieldGet(this, _BreakoutRoomsManager_state, "f").parentMeeting.id);
        __classPrivateFieldGet(this, _BreakoutRoomsManager_allMeetingsMap, "f").delete(meeting.id);
        __classPrivateFieldGet(this, _BreakoutRoomsManager_meetingParticipantsMap, "f").delete(meeting.id);
        if (!isDraftRoom(meeting.id)) {
            __classPrivateFieldGet(this, _BreakoutRoomsManager_meetingsToDelete, "f").add(meeting.id);
        }
    }
    /**
     * assign participants to a meeting
     */
    assignParticipantsToMeeting(customParticipantIds, destinationMeetingId) {
        __classPrivateFieldSet(this, _BreakoutRoomsManager_hasLocalChanges, true, "f");
        customParticipantIds.forEach((participantId) => {
            const currentMeetingId = __classPrivateFieldGet(this, _BreakoutRoomsManager_participantsNewMeetingMap, "f").get(participantId);
            __classPrivateFieldGet(this, _BreakoutRoomsManager_meetingParticipantsMap, "f").get(currentMeetingId).delete(participantId);
            __classPrivateFieldGet(this, _BreakoutRoomsManager_meetingParticipantsMap, "f").get(destinationMeetingId).add(participantId);
            __classPrivateFieldGet(this, _BreakoutRoomsManager_participantsNewMeetingMap, "f").set(participantId, destinationMeetingId);
        });
        return this.currentState;
    }
    /**
     * assign participants randomly
     */
    assignParticipantsRandomly() {
        const splits = splitCollection(this.unassignedParticipants, this.allConnectedMeetings.length);
        this.allConnectedMeetings.forEach((meeting, index) => {
            const toAssign = splits[index];
            if (toAssign && toAssign.length !== 0) {
                this.assignParticipantsToMeeting(toAssign.map((participant) => participant.customParticipantId), meeting.id);
            }
        });
        return this.currentState;
    }
    /**
     * unassign participants
     */
    unassignParticipants(customParticipantIds) {
        const destinationMeetingId = __classPrivateFieldGet(this, _BreakoutRoomsManager_state, "f").parentMeeting.id;
        return this.assignParticipantsToMeeting(customParticipantIds, destinationMeetingId);
    }
    /**
     * unassign all participants
     */
    unassignAllParticipants() {
        const destinationMeetingId = __classPrivateFieldGet(this, _BreakoutRoomsManager_state, "f").parentMeeting.id;
        const customParticipantIds = this.allParticipants.map(participantIdentifier);
        return this.assignParticipantsToMeeting(customParticipantIds, destinationMeetingId);
    }
    /**
     * update current state
     */
    updateCurrentState(state) {
        if (!__classPrivateFieldGet(this, _BreakoutRoomsManager_hasLocalChanges, "f")) {
            __classPrivateFieldGet(this, _BreakoutRoomsManager_instances, "m", _BreakoutRoomsManager_init).call(this, state);
        }
        [state.parentMeeting, ...state.meetings].forEach((meeting, index) => {
            const draftMeeting = Object.assign(Object.assign({}, meeting), { isParent: index === 0 });
            __classPrivateFieldGet(this, _BreakoutRoomsManager_instances, "m", _BreakoutRoomsManager_addNewMeetingToState).call(this, draftMeeting);
            meeting.participants.forEach((participant) => {
                __classPrivateFieldGet(this, _BreakoutRoomsManager_instances, "m", _BreakoutRoomsManager_addNewParticipantToState).call(this, participant, draftMeeting);
            });
        });
    }
    get meetingsToCreate() {
        return this.allConnectedMeetings
            .filter((meeting) => isDraftRoom(meeting.id))
            .map(({ id, title }) => ({ id, title }));
    }
    get meetingsToUpdate() {
        return this.allConnectedMeetings
            .filter((meeting) => __classPrivateFieldGet(this, _BreakoutRoomsManager_meetingsToUpdate, "f").has(meeting.id))
            .map(({ id, title }) => ({ id, title }));
    }
    get meetingsToDelete() {
        return Array.from(__classPrivateFieldGet(this, _BreakoutRoomsManager_meetingsToDelete, "f"));
    }
    get participantsToMove() {
        // gather participants
        const moveMap = new Map();
        Array.from(__classPrivateFieldGet(this, _BreakoutRoomsManager_participantsNewMeetingMap, "f").keys()).forEach((participantId) => {
            const sourceMeetingId = __classPrivateFieldGet(this, _BreakoutRoomsManager_participantsOldMeetingMap, "f").get(participantId);
            const destinationMeetingId = __classPrivateFieldGet(this, _BreakoutRoomsManager_participantsNewMeetingMap, "f").get(participantId);
            if (sourceMeetingId === destinationMeetingId)
                return;
            const key = `${sourceMeetingId}__${destinationMeetingId}`;
            if (!moveMap.has(key)) {
                moveMap.set(key, []);
            }
            const participantDetails = __classPrivateFieldGet(this, _BreakoutRoomsManager_allParticipantsMap, "f").get(participantId);
            moveMap.get(key).push(participantDetails.id);
        });
        return Array.from(moveMap.keys()).map((key) => {
            const [sourceMeetingId, destinationMeetingId] = key.split('__');
            return {
                sourceMeetingId,
                destinationMeetingId,
                participantIds: moveMap.get(key),
            };
        });
    }
    async applyChanges(meeting) {
        // create new rooms
        const createMeetingsPromise = this.meetingsToCreate.length !== 0
            ? meeting.connectedMeetings.createMeetings(this.meetingsToCreate)
            : Promise.resolve([]);
        // update old rooms titles
        const updateMeetingsPromise = this.meetingsToUpdate.length !== 0
            ? meeting.connectedMeetings.updateMeetings(this.meetingsToUpdate)
            : Promise.resolve();
        const [createMeetingsResponse] = await Promise.all([
            createMeetingsPromise,
            updateMeetingsPromise,
        ]);
        // replace temporary ids
        if (createMeetingsResponse) {
            createMeetingsResponse.forEach((meeting) => {
                this.meetingsToCreate.forEach((draftMeeting) => {
                    if (draftMeeting.title === meeting.title) {
                        __classPrivateFieldGet(this, _BreakoutRoomsManager_instances, "m", _BreakoutRoomsManager_replaceDraftMeetingIds).call(this, __classPrivateFieldGet(this, _BreakoutRoomsManager_allMeetingsMap, "f").get(draftMeeting.id), meeting.id);
                    }
                });
            });
        }
        // move participants (no async)
        if (this.participantsToMove.length !== 0) {
            this.participantsToMove.forEach(({ sourceMeetingId, destinationMeetingId, participantIds }) => {
                meeting.connectedMeetings.moveParticipants(sourceMeetingId, destinationMeetingId, participantIds);
            });
        }
        // delete rooms
        if (this.meetingsToDelete.length !== 0) {
            meeting.connectedMeetings.deleteMeetings(this.meetingsToDelete);
        }
    }
    /**
     * discard local changes
     */
    discardChanges() {
        __classPrivateFieldSet(this, _BreakoutRoomsManager_hasLocalChanges, false, "f");
        this.updateCurrentState(__classPrivateFieldGet(this, _BreakoutRoomsManager_state, "f"));
        return this.currentState;
    }
}
_BreakoutRoomsManager_hasLocalChanges = new WeakMap(), _BreakoutRoomsManager_state = new WeakMap(), _BreakoutRoomsManager_participantsNewMeetingMap = new WeakMap(), _BreakoutRoomsManager_participantsOldMeetingMap = new WeakMap(), _BreakoutRoomsManager_meetingParticipantsMap = new WeakMap(), _BreakoutRoomsManager_allParticipantsMap = new WeakMap(), _BreakoutRoomsManager_allMeetingsMap = new WeakMap(), _BreakoutRoomsManager_meetingsToUpdate = new WeakMap(), _BreakoutRoomsManager_meetingsToDelete = new WeakMap(), _BreakoutRoomsManager_instances = new WeakSet(), _BreakoutRoomsManager_init = function _BreakoutRoomsManager_init(state) {
    __classPrivateFieldSet(this, _BreakoutRoomsManager_state, state, "f");
    __classPrivateFieldSet(this, _BreakoutRoomsManager_allMeetingsMap, new Map(), "f");
    __classPrivateFieldSet(this, _BreakoutRoomsManager_allParticipantsMap, new Map(), "f");
    __classPrivateFieldSet(this, _BreakoutRoomsManager_meetingsToUpdate, new Set(), "f");
    __classPrivateFieldSet(this, _BreakoutRoomsManager_meetingsToDelete, new Set(), "f");
    __classPrivateFieldSet(this, _BreakoutRoomsManager_meetingParticipantsMap, new Map(), "f");
    __classPrivateFieldSet(this, _BreakoutRoomsManager_participantsNewMeetingMap, new Map(), "f");
    __classPrivateFieldSet(this, _BreakoutRoomsManager_participantsOldMeetingMap, new Map(), "f");
    __classPrivateFieldSet(this, _BreakoutRoomsManager_participantsOldMeetingMap, new Map(), "f");
    __classPrivateFieldGet(this, _BreakoutRoomsManager_state, "f").parentMeeting.participants.forEach((participant) => {
        __classPrivateFieldGet(this, _BreakoutRoomsManager_participantsOldMeetingMap, "f").set(participantIdentifier(participant), __classPrivateFieldGet(this, _BreakoutRoomsManager_state, "f").parentMeeting.id);
    });
    __classPrivateFieldGet(this, _BreakoutRoomsManager_state, "f").meetings.forEach((meeting) => {
        meeting.participants.forEach((participant) => {
            __classPrivateFieldGet(this, _BreakoutRoomsManager_participantsOldMeetingMap, "f").set(participantIdentifier(participant), meeting.id);
        });
    });
}, _BreakoutRoomsManager_addNewMeetingToState = function _BreakoutRoomsManager_addNewMeetingToState(meeting) {
    if (!__classPrivateFieldGet(this, _BreakoutRoomsManager_allMeetingsMap, "f").has(meeting.id)) {
        __classPrivateFieldGet(this, _BreakoutRoomsManager_allMeetingsMap, "f").set(meeting.id, meeting);
        __classPrivateFieldGet(this, _BreakoutRoomsManager_meetingParticipantsMap, "f").set(meeting.id, new Set());
    }
}, _BreakoutRoomsManager_addNewParticipantToState = function _BreakoutRoomsManager_addNewParticipantToState(participant, meeting) {
    if (__classPrivateFieldGet(this, _BreakoutRoomsManager_allParticipantsMap, "f").has(participantIdentifier(participant))) {
        return;
    }
    __classPrivateFieldGet(this, _BreakoutRoomsManager_allParticipantsMap, "f").set(participantIdentifier(participant), participant);
    __classPrivateFieldGet(this, _BreakoutRoomsManager_participantsNewMeetingMap, "f").set(participantIdentifier(participant), meeting.id);
    __classPrivateFieldGet(this, _BreakoutRoomsManager_meetingParticipantsMap, "f").get(meeting.id).add(participantIdentifier(participant));
}, _BreakoutRoomsManager_replaceDraftMeetingIds = function _BreakoutRoomsManager_replaceDraftMeetingIds(draftMeeting, realId) {
    const draftId = draftMeeting.id;
    __classPrivateFieldGet(this, _BreakoutRoomsManager_instances, "m", _BreakoutRoomsManager_addNewMeetingToState).call(this, Object.assign(Object.assign({}, draftMeeting), { id: realId }));
    __classPrivateFieldGet(this, _BreakoutRoomsManager_allMeetingsMap, "f").delete(draftId);
    const participantSet = __classPrivateFieldGet(this, _BreakoutRoomsManager_meetingParticipantsMap, "f").get(draftId);
    __classPrivateFieldGet(this, _BreakoutRoomsManager_meetingParticipantsMap, "f").set(realId, participantSet);
    __classPrivateFieldGet(this, _BreakoutRoomsManager_meetingParticipantsMap, "f").delete(draftId);
    Array.from(__classPrivateFieldGet(this, _BreakoutRoomsManager_participantsNewMeetingMap, "f").keys()).forEach((participantId) => {
        if (__classPrivateFieldGet(this, _BreakoutRoomsManager_participantsNewMeetingMap, "f").get(participantId) === draftId) {
            __classPrivateFieldGet(this, _BreakoutRoomsManager_participantsNewMeetingMap, "f").set(participantId, realId);
        }
    });
}, _BreakoutRoomsManager_getMeetingParticipants = function _BreakoutRoomsManager_getMeetingParticipants(meetingId) {
    const participantIds = Array.from(__classPrivateFieldGet(this, _BreakoutRoomsManager_meetingParticipantsMap, "f").get(meetingId));
    return participantIds.map((id) => __classPrivateFieldGet(this, _BreakoutRoomsManager_allParticipantsMap, "f").get(id));
};
export default BreakoutRoomsManager;
