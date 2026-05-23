import { DesignTokens } from '../types/ui-config/design-tokens';
/**
 * Provides the design system new tokens to consume values from for styling the RealtimeKit UI components.
 * @param el The element/node you want to _provide_ RTK Design system.
 * @param tokens The design tokens you want to updated.
 */
export declare const provideRtkDesignSystem: (el: HTMLElement, { spacingBase, borderRadius, borderWidth, colors, fontFamily, googleFont, theme, tokenPrefix, }: Omit<DesignTokens, "logo">) => void;
