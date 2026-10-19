import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API_URL } from "../api";

type Option = { id: string; text: string };

type Question = {
  id: string;
  type: string;
  label: string;
  options: Option[];
  required: boolean;
};

type Survey = {
  id: string;
  title: string;
  description: string;
  status: string;
  questions: Question[];
};

const TYPE_NAMES: Record<string, string> = {
  short_text: "Short text",
  long_text: "Long text",
  single_choice: "Single choice",
  multiple_choice: "Multiple choice",
  rating: "Rating (1 to 5)",
};

const MAX_QUESTIONS = 5;

// ---------- one question card ----------

type CardProps = {
  question: Question;
  index: number;
  total: number;
  onMove: (questionId: string, direction: "up" | "down") => void;
  onSaveLabel: (questionId: string, label: string) => void;
  onDelete: (questionId: string) => void;
  onAddOption: (questionId: string, text: string) => void;
  onDeleteOption: (questionId: string, optionId: string) => void;
  onToggleRequired: (questionId: string, required: boolean) => void;
};

function QuestionCard(props: CardProps) {
  const { question } = props;
  const [label, setLabel] = useState(question.label);
  const [newOption, setNewOption] = useState("");

  const isChoice =
    question.type === "single_choice" ||
    question.type === "multiple_choice";

  function addOption() {
    if (newOption.trim() === "") return;

    props.onAddOption(question.id, newOption);
    setNewOption("");
  }

  return (
    <div className="card">
      <div className="card-top">
        <div className="actions">
          <span className="badge">
            {TYPE_NAMES[question.type] ?? question.type}
          </span>

          <label className="choice">
            <input
              type="checkbox"
              checked={question.required}
              onChange={(e) =>
                props.onToggleRequired(question.id, e.target.checked)
              }
            />
            Required
          </label>

          <button
            onClick={() => props.onMove(question.id, "up")}
            disabled={props.index === 0}
            aria-label="Move question up"
            title="Move up"
          >
            ↑
          </button>

          <button
            onClick={() => props.onMove(question.id, "down")}
            disabled={props.index === props.total - 1}
            aria-label="Move question down"
            title="Move down"
          >
            ↓
          </button>
        </div>

        <button onClick={() => props.onDelete(question.id)}>
          Delete question
        </button>
      </div>

      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => {
          if (label !== question.label) {
            props.onSaveLabel(question.id, label);
          }
        }}
        placeholder="Type the question here"
        aria-label="Question text"
      />

      {isChoice && (
        <div className="options">
          {question.options.map((option) => (
            <div key={option.id} className="option-row">
              <span>• {option.text}</span>

              <button
                onClick={() => props.onDeleteOption(question.id, option.id)}
              >
                Remove
              </button>
            </div>
          ))}

          <div className="option-row">
            <input
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              placeholder="New option"
              aria-label="New option"
            />

            <button onClick={addOption}>Add option</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- the whole editor ----------

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState("");

  const [newType, setNewType] = useState("short_text");
  const [newLabel, setNewLabel] = useState("");

  // Load the survey when the page opens.
  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(API_URL + "/surveys/" + id);

        if (!response.ok) {
          setNotFound(true);
          return;
        }

        setSurvey(await response.json());
      } catch {
        setMessage("Could not reach the server. Is the backend running?");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  // Sends one change to the backend. Every route sends back the updated survey.
  async function send(
    method: string,
    path: string,
    body?: object,
  ): Promise<boolean> {
    setMessage("");

    try {
      const response = await fetch(API_URL + "/surveys/" + id + path, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });

      let data: { error?: string } & Partial<Survey> = {};

      try {
        data = await response.json();
      } catch {
        // Keep the empty object if the answer is not JSON.
      }

      if (!response.ok) {
        setMessage(
          data.error ?? "Something went wrong (error " + response.status + ")",
        );
        return false;
      }

      setSurvey(data as Survey);
      return true;
    } catch {
      setMessage("Could not reach the server");
      return false;
    }
  }

  async function addQuestion() {
    const ok = await send("POST", "/questions", {
      type: newType,
      label: newLabel,
    });

    if (ok) setNewLabel("");
  }

  function saveLabel(questionId: string, label: string) {
    send("PATCH", "/questions/" + questionId, { label: label });
  }

  function toggleRequired(questionId: string, required: boolean) {
    send("PATCH", "/questions/" + questionId, { required: required });
  }

  function deleteQuestion(questionId: string) {
    send("DELETE", "/questions/" + questionId);
  }

  // Move a question one position up or down.
  function moveQuestion(questionId: string, direction: "up" | "down") {
    send("PATCH", "/questions/" + questionId + "/move", {
      direction: direction,
    });
  }

  function addOption(questionId: string, text: string) {
    send("POST", "/questions/" + questionId + "/options", { text: text });
  }

  function deleteOption(questionId: string, optionId: string) {
    send("DELETE", "/questions/" + questionId + "/options/" + optionId);
  }

  async function publish() {
    const ok = await send("POST", "/publish");

    if (ok) navigate("/authors/surveys");
  }

  if (loading) return <p>Loading...</p>;

  if (notFound) {
    return (
      <p>
        Survey not found. <Link to="/authors/surveys">Back</Link>
      </p>
    );
  }

  if (!survey) return <p className="error">{message}</p>;

  // Only a draft can be edited.
  if (survey.status !== "draft") {
    return (
      <div>
        <h1>{survey.title}</h1>
        <p>This survey is {survey.status}, so it can no longer be edited.</p>
        <Link className="button" to="/authors/surveys">
          Back to surveys
        </Link>
      </div>
    );
  }

  const full = survey.questions.length >= MAX_QUESTIONS;

  return (
    <div>
      <div className="top-row">
        <div>
          <h1>{survey.title}</h1>
          {survey.description && <p>{survey.description}</p>}
        </div>

        <span className="badge draft">draft</span>
      </div>

      {message && <p className="error">{message}</p>}

      {survey.questions.length === 0 && (
        <p>No questions yet. Add the first one below.</p>
      )}

      {survey.questions.map((question, index) => (
        <QuestionCard
          key={question.id}
          question={question}
          index={index}
          total={survey.questions.length}
          onMove={moveQuestion}
          onSaveLabel={saveLabel}
          onDelete={deleteQuestion}
          onAddOption={addOption}
          onDeleteOption={deleteOption}
          onToggleRequired={toggleRequired}
        />
      ))}

      <div className="card">
        <h3>Add a question</h3>

        <div className="option-row">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            aria-label="Question type"
          >
            {Object.keys(TYPE_NAMES).map((type) => (
              <option key={type} value={type}>
                {TYPE_NAMES[type]}
              </option>
            ))}
          </select>

          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Question text"
            aria-label="New question text"
          />

          <button onClick={addQuestion} disabled={full}>
            Add question
          </button>
        </div>

        {full && <p>A survey can have only {MAX_QUESTIONS} questions.</p>}
      </div>

      <div className="actions">
        <Link
          className="button"
          to={"/authors/surveys/" + survey.id + "/preview"}
        >
          Preview
        </Link>

        <button onClick={publish}>Publish survey</button>

        <Link className="button" to="/authors/surveys">
          Back to surveys
        </Link>
      </div>
    </div>
  );
}