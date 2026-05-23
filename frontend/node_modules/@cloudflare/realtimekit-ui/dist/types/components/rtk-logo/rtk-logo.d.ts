import { UIConfig } from '../../types/ui-config';
import { RtkI18n } from '../../lib/lang';
import { Meeting } from '../../types/rtk-client';
/**
 * A component which loads the logo from your config, or via the `logo-url` attribute.
 */
export declare class RtkLogo {
    /** Logo URL */
    logoUrl: string;
    /** Config object */
    config: UIConfig;
    /** Meeting object */
    meeting: Meeting;
    /** Language */
    t: RtkI18n;
    connectedCallback(): void;
    configChanged(config: UIConfig): void;
    meetingChanged(meeting: Meeting): void;
    render(): any;
}
