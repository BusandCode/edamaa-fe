import { UIConfig } from '../../types/ui-config';
import { RtkI18n } from '../../lib/lang';
import { IconPack } from '../../lib/icons';
import { Meeting } from '../../types/rtk-client';
export declare class RtkWaitingScreen {
    /** Meeting object */
    meeting: Meeting;
    /** Config */
    config: UIConfig;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    render(): any;
}
