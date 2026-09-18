import { useRef, useState } from "react";
import Modal from "./Modal.jsx";
import RichTextEditor from "./RichTextEditor.jsx";

const MAX_PHOTOS = 4;

function isBodyEmpty(html) {
  const text = html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, "").trim();
  return text.length === 0;
}

export default function EntryFormModal({
  entry,
  title = "Edit entry",
  placeholder = "",
  saveLabel = "Save",
  onSave,
  onUploadPhotos,
  onDeletePhoto,
  onPhotosChanged,
  onClose,
}) {
  const [html, setHtml] = useState(entry?.body || "");
  const [existingPhotos, setExistingPhotos] = useState(entry?.photos || []);
  const [removedPhotoIds, setRemovedPhotoIds] = useState([]);
  const [stagedFiles, setStagedFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const stagedFilesRef = useRef(stagedFiles);
  stagedFilesRef.current = stagedFiles;

  const totalPhotos = existingPhotos.length + stagedFiles.length;

  function handleFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const remaining = Math.max(0, MAX_PHOTOS - totalPhotos);
    if (files.length > remaining) {
      setError(`You can attach up to ${MAX_PHOTOS} photos per entry`);
    }
    const staged = files.slice(0, remaining).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setStagedFiles((prev) => [...prev, ...staged]);
  }

  function removeExistingPhoto(id) {
    setExistingPhotos((prev) => prev.filter((p) => p.id !== id));
    setRemovedPhotoIds((prev) => [...prev, id]);
  }

  function removeStagedFile(index) {
    setStagedFiles((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleClose() {
    stagedFilesRef.current.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    onClose();
  }

  async function submit(e) {
    e.preventDefault();
    if (isBodyEmpty(html)) {
      setError("Entry text is required");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await onSave(html);
      for (const photoId of removedPhotoIds) {
        await onDeletePhoto(saved.id, photoId);
      }
      if (stagedFiles.length > 0) {
        await onUploadPhotos(saved.id, stagedFiles.map((s) => s.file));
      }
      if (removedPhotoIds.length > 0 || stagedFiles.length > 0) {
        onPhotosChanged();
      }
      stagedFilesRef.current.forEach((s) => URL.revokeObjectURL(s.previewUrl));
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={handleClose} wide>
      <form className="entry-form" onSubmit={submit}>
        <RichTextEditor initialValue={html} onChange={setHtml} placeholder={placeholder} autoFocus />

        <div className="photo-attachments">
          <span className="photo-attachments-label">Photos</span>
          {(existingPhotos.length > 0 || stagedFiles.length > 0) && (
            <div className="photo-attachments-grid">
              {existingPhotos.map((photo) => (
                <div className="photo-attachment" key={`existing-${photo.id}`}>
                  <img src={photo.url} alt="" />
                  <button
                    type="button"
                    className="photo-attachment-remove"
                    onClick={() => removeExistingPhoto(photo.id)}
                    aria-label="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {stagedFiles.map((staged, i) => (
                <div className="photo-attachment" key={`staged-${i}`}>
                  <img src={staged.previewUrl} alt="" />
                  <button
                    type="button"
                    className="photo-attachment-remove"
                    onClick={() => removeStagedFile(i)}
                    aria-label="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          {totalPhotos < MAX_PHOTOS && (
            <button type="button" className="btn btn-sm" onClick={() => fileInputRef.current?.click()}>
              + Add photos
            </button>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFilesSelected}
          />
        </div>

        {error && <p className="error-text">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={handleClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : saveLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
