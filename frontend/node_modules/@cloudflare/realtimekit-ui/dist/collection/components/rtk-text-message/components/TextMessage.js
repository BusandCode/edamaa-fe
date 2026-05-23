import { h } from "@stencil/core";
import { MAX_TEXT_LENGTH, extractReplyBlock, parseRichText, stripOutReplyBlock, } from "../../../utils/chat";
const renderLink = (content) => {
    return (h("a", { class: "link", href: content, target: "_blank", rel: "noopener noreferrer" }, content));
};
const renderBold = (content) => {
    if (typeof content === 'string') {
        return h("b", null, content);
    }
    return h("b", null, renderTokens(content));
};
const renderItalic = (content) => {
    if (typeof content === 'string') {
        return h("i", null, content);
    }
    return h("i", null, renderTokens(content));
};
const renderStrikethrough = (content) => {
    if (typeof content === 'string') {
        return h("s", null, content);
    }
    return h("b", null, renderTokens(content));
};
const renderPlainText = (content) => {
    if (typeof content === 'string') {
        return content;
    }
    return h("p", null, renderTokens(content));
};
const renderTokens = (tokens) => {
    return tokens.map((token) => {
        switch (token.type) {
            case 'a':
                if (typeof token.content === 'string') {
                    return renderLink(token.content);
                }
            case 'b':
                return renderBold(token.content);
            case 'i':
                return renderItalic(token.content);
            case 's':
                return renderStrikethrough(token.content);
            case 'q':
                return h("span", { class: "block-quote" });
            case 'plain_text':
            default:
                return renderPlainText(token.content);
        }
    });
};
export const TextMessageView = ({ message }) => {
    const slicedMessage = message.slice(0, MAX_TEXT_LENGTH);
    const withReply = extractReplyBlock(slicedMessage, true);
    const withoutReply = stripOutReplyBlock(slicedMessage);
    return (h("p", null, withReply.length !== 0 && (h("blockquote", null, withReply.split('\n').map((line) => {
        const tokens = parseRichText(line);
        return h("p", null, renderTokens(tokens));
    }))), withoutReply.split('\n').map((line) => {
        const tokens = parseRichText(line);
        return h("p", null, renderTokens(tokens));
    })));
};
