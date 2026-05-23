import type { RecordingState } from '@cloudflare/realtimekit';
import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Meeting } from '../../types/rtk-client';
import { Size } from '../../types/props';
import { ControlBarVariant } from '../rtk-controlbar-button/rtk-controlbar-button';
/**
 * A button which toggles recording state of a meeting.
 *
 * Only a privileged user can perform this action,
 * thus the button will not be visible for participants
 * who don't have the permission to record a meeting.
 */
export declare class RtkRecordingToggle {
    private recordingStateUpdateListener;
    /** Variant */
    variant: ControlBarVariant;
    /** Meeting object */
    meeting: Meeting;
    /** Language */
    t: RtkI18n;
    /** Icon pack */
    iconPack: IconPack;
    /** Size */
    size: Size;
    /** Disable the button */
    disabled: boolean;
    recordingState: RecordingState;
    canRecord: boolean;
    /**
     * Emit api error events
     */
    apiError: EventEmitter<{
        trace: string;
        message: string;
    }>;
    connectedCallback(): void;
    disconnectedCallback(): void;
    meetingChanged(meeting: Meeting): void;
    private permissionsUpdateListener;
    private toggleRecording;
    private getLabel;
    private getIcon;
    private isLoading;
    render(): any;
}
