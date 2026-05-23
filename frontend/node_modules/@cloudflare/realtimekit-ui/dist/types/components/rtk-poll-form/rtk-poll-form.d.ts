import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { PollObject } from '../../types/props';
/**
 * A component that lets you create a poll.
 */
export declare class RtkPoll {
    private question;
    /** Event which is emitted when a poll is created */
    onCreate: EventEmitter<PollObject>;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Options */
    options: string[];
    anonymous: boolean;
    hideVotes: boolean;
    /** Error Text */
    error: {
        code: number;
        message: string;
    };
    private removeOption;
    private addOption;
    private updateOption;
    private handleSubmit;
    render(): any;
}
