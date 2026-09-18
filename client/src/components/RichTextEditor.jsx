import { useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

const TOOLBAR_OPTIONS = [
  ["bold", "italic", "underline", "strike"],
  [{ header: 1 }, { header: 2 }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["blockquote", "link"],
  ["clean"],
];

export default function RichTextEditor({ initialValue = "", onChange, placeholder, autoFocus }) {
  const containerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const quill = new Quill(containerRef.current, {
      theme: "snow",
      placeholder,
      modules: { toolbar: TOOLBAR_OPTIONS },
    });

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

  return (
    <div className="rich-text-editor">
      <div ref={containerRef} />
    </div>
  );
}
