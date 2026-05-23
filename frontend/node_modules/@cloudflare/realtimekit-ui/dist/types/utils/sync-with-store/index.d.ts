import { ComponentInterface } from '../../stencil-public-runtime';
import { type RtkUiStore } from './ui-store';
export declare function SyncWithStore(): (proto: ComponentInterface, propName: keyof RtkUiStore) => void;
