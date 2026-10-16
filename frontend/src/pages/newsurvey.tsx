import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_URL } from "../api";

export default function NewSurvey() {
  const navigate = useNavigate();

  // What the user has typed so far
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); // stop the browser from reloading the page
    setError("");

    if (title.trim() === "") {
      setError("Please enter a title");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(API_URL + "/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title, description: description }),
      });

      if (!response.ok) {
        const body = await response.json();
        setError(body.error ?? "Something went wrong");
        return;
      }

      const survey = await response.json();
      navigate("/authors/surveys/" + survey.id + "/edit");
    } catch {
      setError("Could not reach the server. Is the backend running?");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1>New survey</h1>

      <form onSubmit={handleSubmit} className="form">
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Week 1 check-in"
          />
        </label>

        <label>
          Description (optional)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <div className="actions">
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Create survey"}
          </button>
          <Link className="button" to="/authors/surveys">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}