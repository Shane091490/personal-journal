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

const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 24;
const MAX_MOOD_LENGTH = 4;

// String#slice cuts by UTF-16 code unit and can split a surrogate pair (e.g. an
// emoji) in half, leaving an unpaired/malformed character in stored data.
// Array.from splits on codepoints instead, so truncation always lands on a
// whole character.
function truncateSafely(str, maxLength) {
  return Array.from(str).slice(0, maxLength).join("");
}

export function sanitizeTags(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const tag = truncateSafely(raw.trim().toLowerCase(), MAX_TAG_LENGTH);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

export function sanitizeMood(input) {
  if (typeof input !== "string") return null;
  const mood = truncateSafely(input.trim(), MAX_MOOD_LENGTH);
  return mood || null;
}
