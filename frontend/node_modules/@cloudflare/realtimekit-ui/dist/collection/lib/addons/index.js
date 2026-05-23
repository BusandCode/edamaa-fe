import { generateConfig } from "../../utils/config";
import { RtkUiBuilder } from "../builder";
/**
 * Register addons to the meeting
 * @param addons The list of addons to register
 * @param meeting The meeting object
 * @param config The current UIConfig
 * @returns The updated UIConfig
 */
export function registerAddons(addons, meeting, config) {
    if (!config) {
        const generated = generateConfig(meeting.self.config, meeting);
        config = generated.config;
    }
    addons.map((addon) => {
        config = addon.register(config, meeting, (c) => new RtkUiBuilder(c));
    });
    return config;
}
