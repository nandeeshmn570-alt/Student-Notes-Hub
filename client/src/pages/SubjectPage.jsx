import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { StatusMessage } from "../components/StatusMessage";
import { subjects } from "../data";

export function SubjectPage({ isAdmin }) {
  const { subjectId } = useParams();
  const subject = subjects.find((item) => item.id === subjectId);
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [state, setState] = useState({ loading: true, submitting: false, error: "", message: "" });
  const inputRef = useRef(null);
  const selectedSize = selectedFiles.reduce((total, file) => total + file.size, 0);

  function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function addSelectedFiles(fileList) {
    const newFiles = Array.from(fileList || []);
    if (newFiles.length === 0) return;

    setSelectedFiles((currentFiles) => {
      const existingFiles = new Set(currentFiles.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      const uniqueNewFiles = newFiles.filter((file) => !existingFiles.has(`${file.name}-${file.size}-${file.lastModified}`));
      return [...currentFiles, ...uniqueNewFiles];
    });
    setState((current) => ({ ...current, error: "", message: "" }));
  }

  function handleFileDrop(event) {
    event.preventDefault();
    addSelectedFiles(event.dataTransfer.files);
  }

  function removeSelectedFile(fileToRemove) {
    setSelectedFiles((currentFiles) => currentFiles.filter((file) => file !== fileToRemove));
  }

  useEffect(() => {
    let active = true;
    setState({ loading: true, submitting: false, error: "", message: "" });
    api.listFiles(subjectId)
      .then((data) => active && setFiles(data))
      .catch((error) => active && setState((current) => ({ ...current, error: error.message })))
      .finally(() => active && setState((current) => ({ ...current, loading: false })));
    return () => { active = false; };
  }, [subjectId]);

  if (!subject) return <StatusMessage error="Subject not found" />;

  const upload = async (event) => {
    event.preventDefault();
    if (selectedFiles.length === 0) {
      setState((current) => ({ ...current, error: "Please select at least one file." }));
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("file", file));
    setState({ loading: false, submitting: true, error: "", message: "" });

    try {
      const response = await api.uploadFiles(subjectId, formData);
      const updatedFiles = await api.listFiles(subjectId);
      setFiles(updatedFiles);
      setSelectedFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      setState({ loading: false, submitting: false, error: "", message: response.message });
    } catch (error) {
      setState({ loading: false, submitting: false, error: error.message, message: "" });
    }
  };

  const remove = async (file) => {
    if (!window.confirm("Delete this file?")) return;
    try {
      const response = await api.deleteFile(subjectId, file.id);
      setFiles((current) => current.filter((currentFile) => currentFile.id !== file.id));
      setState((current) => ({ ...current, error: "", message: response.message }));
    } catch (error) {
      setState((current) => ({ ...current, error: error.message, message: "" }));
    }
  };

  return (
    <section className="subject-page">
      <div className="subject-heading">
        <p className="eyebrow">{subject.id.toUpperCase()}</p>
        <h1>{subject.title}</h1>
      </div>
      {isAdmin && (
        <form className="upload-card" onSubmit={upload}>
          <div className="upload-heading">
            <div>
              <p className="eyebrow">ADMIN TOOL</p>
              <h2>Add study files</h2>
              <p className="upload-hint">Upload PDFs, images, or documents to Cloudinary.</p>
            </div>
            <span className="upload-limit">10 MB max/file</span>
          </div>
          <label className="file-picker" htmlFor="note-files" onDragOver={(event) => event.preventDefault()} onDrop={handleFileDrop}>
            <span className="file-picker-icon" aria-hidden="true">+</span>
            <span><strong>Choose multiple files</strong><small>Click to browse or drag files here</small></span>
          </label>
          <input className="visually-hidden" ref={inputRef} id="note-files" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png" multiple onChange={(event) => { addSelectedFiles(event.target.files); event.target.value = ""; }} />
          {selectedFiles.length > 0 && (
            <div className="selected-files" aria-live="polite">
              <div className="selected-files-heading"><strong>{selectedFiles.length} file{selectedFiles.length === 1 ? "" : "s"} selected</strong><span>{formatFileSize(selectedSize)}</span></div>
              {selectedFiles.map((file) => (
                <span className="selected-file-name" key={`${file.name}-${file.lastModified}`}>
                  <span>{file.name}</span>
                  <button type="button" onClick={() => removeSelectedFile(file)} aria-label={`Remove ${file.name}`}>Remove</button>
                </span>
              ))}
            </div>
          )}
          <button className="primary-button upload-submit" type="submit" disabled={state.submitting || selectedFiles.length === 0}>{state.submitting ? "Uploading to Cloudinary..." : "Upload files"}</button>
        </form>
      )}
      <StatusMessage error={state.error} message={state.message} />
      <div className="notes-panel">
        <div className="panel-heading"><p className="eyebrow">AVAILABLE NOTES</p><span>{state.loading ? "Loading..." : `${files.length} file${files.length === 1 ? "" : "s"}`}</span></div>
        {!state.loading && files.length === 0 && <p className="empty-state">No notes have been uploaded yet.</p>}
        <div className="file-grid">
          {files.map((file) => (
            <article className="note-file-card" key={file.id}>
              <div className="note-file-icon" aria-hidden="true">📄</div>
              <div className="note-file-details">
                <span className="note-file-label">STUDY NOTE</span>
                <a className="file-link" href={file.url} target="_blank" rel="noreferrer">{file.fileName}</a>
              </div>
              <div className="note-file-actions">
                <a className="download-button" href={file.url} target="_blank" rel="noreferrer">Open</a>
                {isAdmin && <button className="delete-button" type="button" onClick={() => remove(file)}>Delete</button>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
