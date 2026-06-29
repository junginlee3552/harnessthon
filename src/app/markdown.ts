import React from "react";

// Inline markdown: **bold**, `code`, and [text](url) links.
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+?)`|\[([^\]]+?)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(React.createElement("strong", { key: key++ }, m[1]));
    } else if (m[2] !== undefined) {
      nodes.push(React.createElement("code", { key: key++ }, m[2]));
    } else if (m[3] !== undefined) {
      nodes.push(
        React.createElement("a", { key: key++, href: m[4], target: "_blank", rel: "noopener noreferrer" }, m[3])
      );
    } else {
      nodes.push(
        React.createElement("a", { key: key++, href: m[5], target: "_blank", rel: "noopener noreferrer" }, m[5])
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// Block markdown: headings (#, ##, ###), bullet lists (-, *), and paragraphs.
export function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.trim().split("\n");
  const blocks: React.ReactNode[] = [];
  let key = 0;
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (para.length === 0) return;
    const children: React.ReactNode[] = [];
    para.forEach((l, i) => {
      children.push(...renderInline(l));
      if (i < para.length - 1) children.push(React.createElement("br", { key: `b${i}` }));
    });
    blocks.push(React.createElement("p", { key: key++ }, children));
    para = [];
  };
  const flushList = () => {
    if (list.length === 0) return;
    blocks.push(
      React.createElement(
        "ul",
        { key: key++ },
        list.map((item, i) => React.createElement("li", { key: i }, renderInline(item)))
      )
    );
    list = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (line === "") {
      flushPara();
      flushList();
    } else if (heading) {
      flushPara();
      flushList();
      const tag = `h${heading[1].length + 2}` as "h3" | "h4" | "h5";
      blocks.push(React.createElement(tag, { key: key++ }, renderInline(heading[2])));
    } else if (bullet) {
      flushPara();
      list.push(bullet[1]);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}
