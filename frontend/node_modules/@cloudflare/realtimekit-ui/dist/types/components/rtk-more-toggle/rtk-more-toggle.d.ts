import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { Size, States } from '../../types/props';
import { EventEmitter } from '../../stencil-public-runtime';
/**
 * A button which toggles visibility of a more menu.
 *
 * When clicked it emits a `rtkStateUpdate` event with the data:
 *
 * ```ts
 * { activeMoreMenu: boolean; }
 * ```
 */
export declare class RtkMoreToggle {
    host: HTMLRtkMoreToggleElement;
    /** States object */
    states: States;
    /** Size */
    size: Size;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private handleKeyDown;
    private handleOnClick;
    private toggleMoreMenu;
    render(): any;
}
