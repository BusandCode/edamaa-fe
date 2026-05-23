import { EventEmitter } from '../../stencil-public-runtime';
import type { DeviceConfig } from '@cloudflare/realtimekit';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Meeting } from '../../types/rtk-client';
import { States } from '../../types/props';
/**
 * A component which shows permission related troubleshooting
 * information.
 */
export declare class RtkPermissionsMessage {
    /** Meeting object */
    meeting: Meeting;
    /** Language */
    t: RtkI18n;
    /** Icon Pack */
    iconPack: IconPack;
    /** States object */
    states: States;
    device: DeviceConfig;
    currentStep: number;
    svgSteps: string[];
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    private getLink;
    private continue;
    private reload;
    private isDeniedBySystem;
    private getTitle;
    private get mediaType();
    private getMessage;
    private getImage;
    private nextStep;
    private openMacSystemSettings;
    private stepsTimer;
    render(): any;
}
