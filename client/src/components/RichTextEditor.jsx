import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import EmojiPicker from "./EmojiPicker.jsx";

const TOOLBAR_OPTIONS = [
  ["bold", "italic", "underline", "strike"],
  [{ header: 1 }, { header: 2 }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["blockquote", "link"],
  ["emoji"],
  ["clean"],
];

const PICKER_WIDTH = 280;

export default function RichTextEditor({ initialValue = "", onChange, placeholder, autoFocus }) {
  const containerRef = useRef(null);
  const quillRef = useRef(null);
  const savedRangeRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [pickerAnchor, setPickerAnchor] = useState(null);

  useEffect(() => {
    const quill = new Quill(containerRef.current, {
      theme: "snow",
      placeholder,
      modules: {
        toolbar: {
          container: TOOLBAR_OPTIONS,
          handlers: {
            emoji() {
              savedRangeRef.current = quill.getSelection(true) || { index: quill.getLength(), length: 0 };
              const button = this.container.querySelector(".ql-emoji");
              const rect = button.getBoundingClientRect();
              setPickerAnchor({
                top: rect.bottom + 6,
                left: Math.min(rect.left, window.innerWidth - PICKER_WIDTH - 16),
              });
            },
          },
        },
      },
    });
    quillRef.current = quill;

    if (initialValue) {
      quill.clipboard.dangerouslyPasteHTML(initialValue);
    }
    if (autoFocus) {
      quill.focus();
    }

    quill.on("text-change", () => {
      const html = quill.root.innerHTML;
      onChangeRef.current(html === "<p><br></p>" ? "" : html);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function insertEmoji(emoji) {
    const quill = quillRef.current;
    const range = savedRangeRef.current || { index: quill.getLength(), length: 0 };
    quill.insertText(range.index, emoji, "user");
    quill.setSelection(range.index + emoji.length, 0, "user");
    setPickerAnchor(null);
  }

  return (
    <div className="rich-text-editor">
      <div ref={containerRef} />
      {pickerAnchor &&
        createPortal(
          <EmojiPicker anchor={pickerAnchor} onSelect={insertEmoji} onClose={() => setPickerAnchor(null)} />,
          document.body
        )}
    </div>
  );
}
