import { EventEmitter } from '../../stencil-public-runtime';
import { IconPack } from '../../lib/icons';
import { RtkI18n } from '../../lib/lang';
import { States } from '../../types/props';
/**
 * A component used as a stage that commonly houses
 * the `grid` and `sidebar` components.
 *
 *  @slot - Default slot
 */
export declare class RtkStage {
    /** Emits updated state data */
    stateUpdate: EventEmitter<States>;
    /** Icon pack */
    iconPack: IconPack;
    /** Language */
    t: RtkI18n;
    render(): any;
}
