import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "h1",
  "h2",
  "h3",
  "blockquote",
  "ol",
  "ul",
  "li",
  "a",
];

export function isEntryBodyEmpty(html) {
  const text = sanitizeHtml(html || "", { allowedTags: [], allowedAttributes: {} });
  return text.replace(/\s|&nbsp;/g, "").length === 0;
}

const TRAILING_EMPTY_LINE = /(?:<p>(?:<br\s*\/?>|&nbsp;|\s)*<\/p>\s*)+$/i;

export function sanitizeEntryBody(html) {
  const clean = sanitizeHtml(html || "", {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
    },
    // Photos are attached separately and rendered below the text; never allow inline images.
    exclusiveFilter: (frame) => frame.tag === "img",
  });
  return clean.replace(TRAILING_EMPTY_LINE, "");
}
