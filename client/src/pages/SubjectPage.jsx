import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { StatusMessage } from "../components/StatusMessage";
import { subjects } from "../data";

function displayName(fileName) {
  const separatorIndex = fileName.indexOf("-");
  return separatorIndex >= 0 ? fileName.slice(separatorIndex + 1) : fileName;
}

export function SubjectPage({ isAdmin }) {
  const { subjectId } = useParams();
  const subject = subjects.find((item) => item.id === subjectId);
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [state, setState] = useState({ loading: true, submitting: false, error: "", message: "" });
  const inputRef = useRef(null);

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

  const remove = async (fileName) => {
    if (!window.confirm("Delete this file?")) return;
    try {
      const response = await api.deleteFile(subjectId, fileName);
      setFiles((current) => current.filter((file) => file !== fileName));
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
          <label htmlFor="note-files">Add study files</label>
          <input ref={inputRef} id="note-files" type="file" multiple onChange={(event) => setSelectedFiles([...event.target.files])} />
          <button className="primary-button" type="submit" disabled={state.submitting}>{state.submitting ? "Uploading..." : "Upload files"}</button>
        </form>
      )}
      <StatusMessage error={state.error} message={state.message} />
      <div className="notes-panel">
        <div className="panel-heading"><p className="eyebrow">AVAILABLE NOTES</p><span>{state.loading ? "Loading..." : `${files.length} file${files.length === 1 ? "" : "s"}`}</span></div>
        {!state.loading && files.length === 0 && <p className="empty-state">No notes have been uploaded yet.</p>}
        <div className="file-grid">
          {files.map((fileName) => (
            <div className="file-row-react" key={fileName}>
              <a className="file-link" href={`/uploads/${subjectId}/${encodeURIComponent(fileName)}`} target="_blank" rel="noreferrer">📄 {displayName(fileName)}</a>
              {isAdmin && <button className="delete-button" type="button" onClick={() => remove(fileName)}>Delete</button>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
