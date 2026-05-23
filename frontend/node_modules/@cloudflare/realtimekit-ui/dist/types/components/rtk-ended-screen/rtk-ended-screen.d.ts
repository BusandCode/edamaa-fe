import { RtkI18n } from '../../lib/lang';
import { Size, States } from '../../types/props';
import { UIConfig } from '../../types/ui-config';
import { IconPack } from '../../lib/icons';
import { Meeting } from '../../types/rtk-client';
/**
 * A screen which shows a meeting has ended.
 */
export declare class RtkEndedScreen {
    /** Config object */
    config: UIConfig;
    /** Size */
    size: Size;
    /** Icon */
    icon: IconPack;
    /** Global states */
    states: States;
    /** Language */
    t: RtkI18n;
    /** Icon pack */
    iconPack: IconPack;
    message: string;
    /** Global states */
    meeting: Meeting;
    connectedCallback(): void;
    private getBreakoutRoomsMessage;
    statesChanged(states: States): void;
    private renderBreakoutRoomScreen;
    render(): any;
}
