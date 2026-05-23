export declare class RtkMarkdownView {
    /** raw text to render as markdown */
    text: string;
    /** max length of text to render as markdown */
    maxLength: number;
    private restoreEmpty;
    private renderLink;
    private renderBold;
    private renderItalic;
    private renderStrikethrough;
    private renderPlainText;
    private renderTokens;
    private renderMessage;
    render(): any;
}
