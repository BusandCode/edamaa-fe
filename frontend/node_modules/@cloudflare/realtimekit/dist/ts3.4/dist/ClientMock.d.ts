interface StubsParams {
    peerId: string;
    mockParticipants: MockParticipant[];
}
declare function setupStubs(params: StubsParams): void;
interface MockParticipant {
    peerId: string;
    displayName: string;
    stageStatus: number;
}
export { MockParticipant, setupStubs };
