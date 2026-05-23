import type { StageStatus } from '@cloudflare/realtimekit';
import { EventEmitter } from '../../stencil-public-runtime';
import { Size, IconPack, RtkI18n, States } from '../../exports';
import { Meeting } from '../../types/rtk-client';
import { ControlBarVariant } from '../rtk-controlbar-button/rtk-controlbar-button';
interface DataState {
    label: string;
    disabled: boolean;
    icon: string;
}
export declare class RtkStageToggle {
    /** Variant */
    variant: ControlBarVariant;
    /** Meeting object */
    meeting: Meeting;
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    /** States */
    states: States;
    /** Language */
    t: RtkI18n;
    stageStatus: StageStatus;
    state: DataState;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    connectedCallback(): void;
    private stageStatusHandler;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    private stageCallback;
    private getState;
    render(): any;
}
export {};
