export const canJoinStage = (meeting) => {
    var _a, _b;
    return (((_a = meeting === null || meeting === void 0 ? void 0 : meeting.self) === null || _a === void 0 ? void 0 : _a.permissions.stageEnabled) && ((_b = meeting === null || meeting === void 0 ? void 0 : meeting.self) === null || _b === void 0 ? void 0 : _b.permissions.stageAccess) === 'ALLOWED');
};
export const canRequestToJoinStage = (meeting) => {
    var _a, _b;
    return (((_a = meeting === null || meeting === void 0 ? void 0 : meeting.self) === null || _a === void 0 ? void 0 : _a.permissions.stageEnabled) &&
        ((_b = meeting === null || meeting === void 0 ? void 0 : meeting.self) === null || _b === void 0 ? void 0 : _b.permissions.stageAccess) !== 'NOT_ALLOWED');
};
