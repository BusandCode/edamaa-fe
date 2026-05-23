import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Meeting } from '../../types/rtk-client';
import { Size, States } from '../../types/props';
import { UIConfig } from '../../types/ui-config';
export interface ModalDataConfig {
    title: string;
    label: {
        accept: string;
        reject: string;
    };
    description: string;
}
export declare class RtkJoinStage {
    /** Meeting object */
    meeting: Meeting;
    /** UI Config */
    config: UIConfig;
    /** States object */
    states: States;
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Content Config */
    dataConfig: ModalDataConfig;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    /** Event which is emitted when user confirms joining stage */
    joinStage: EventEmitter<void>;
    /** Event which is emitted when user cancel joining stage */
    leaveStage: EventEmitter<void>;
    isLoading: boolean;
    render(): any;
}
