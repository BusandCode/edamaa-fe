import { h } from "@stencil/core";
import { elapsedDuration, formatDateTime } from "../../../utils/date";
import { formatName, shorten } from "../../../utils/string";
export const ChatHead = ({ name, time, now }) => {
    return (h("div", { class: "head" }, h("div", { class: "name" }, shorten(formatName(name), 20)), h("div", { class: "time", title: formatDateTime(time) }, elapsedDuration(time, now))));
};
