import { useEffect, useRef } from "react";
import { EMOJI_CATEGORIES } from "../emojiData.js";

export default function EmojiPicker({ anchor, onSelect, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div className="emoji-picker" ref={ref} style={{ top: anchor.top, left: anchor.left }}>
      {EMOJI_CATEGORIES.map((cat) => (
        <div key={cat.name} className="emoji-picker-category">
          <div className="emoji-picker-category-label">{cat.name}</div>
          <div className="emoji-picker-grid">
            {cat.emojis.map((e) => (
              <button type="button" key={e} className="emoji-picker-item" onClick={() => onSelect(e)}>
                {e}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
