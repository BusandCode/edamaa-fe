import type { RTKThemePreset } from '@cloudflare/realtimekit';
import { UIConfig } from '../types/ui-config';
import { Meeting } from '../types/rtk-client';
/**
 * Extend the default UI Config with your own
 * @param config Your extended UI Config
 * @returns New extended UI Config object
 */
export declare const extendConfig: (config: UIConfig, baseConfig?: UIConfig) => UIConfig;
type ConfigData = {
    showSetupScreen: boolean;
};
type ConfigOptions = {
    grid_pagination?: boolean;
    settings_toggle?: boolean;
};
/**
 * Generates a config with older theme value.
 * @param oldConfig Theme object
 * @param toExtend UI Config object to extend the generated config
 * @param options Options for toggling components
 * @returns
 */
export declare const generateConfig: (oldConfig: Partial<RTKThemePreset>, meeting: Meeting, toExtend?: UIConfig, options?: ConfigOptions) => {
    config: UIConfig;
    data: ConfigData;
};
export {};
