import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API_URL } from "../api";

type Option = {
  id: string;
  text: string;
  helperText?: string;
};

type Question = {
  id: string;
  type: string;
  label: string;
  options: Option[];
  required: boolean;
  maxWords: number | null;
  helperText: string;
};

type Survey = {
  id: string;
  title: string;
  description: string;
  status: string;
  version: number;
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

// ---------- One option row ----------

function OptionRow(props: {
  option: Option;
  onSave: (
    optionId: string,
    changes: { text?: string; helperText?: string },
  ) => void;
  onDelete: (optionId: string) => void;
  busy: boolean;
}) {
  const [text, setText] = useState(props.option.text);
  const [helper, setHelper] = useState(props.option.helperText ?? "");

  useEffect(() => {
    setText(props.option.text);
    setHelper(props.option.helperText ?? "");
  }, [props.option.text, props.option.helperText]);

  // If a save fails, what you typed stays in the box: the state only changes
  // when the server sends back a different saved value.
  return (
    <div className="option-row">
      <input
        value={text}
        disabled={props.busy}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text !== props.option.text) {
            props.onSave(props.option.id, { text });
          }
        }}
        aria-label="Option text"
      />

      <input
        value={helper}
        disabled={props.busy}
        onChange={(e) => setHelper(e.target.value)}
        onBlur={() => {
          if (helper !== (props.option.helperText ?? "")) {
            props.onSave(props.option.id, { helperText: helper });
          }
        }}
        placeholder="Helper text (optional)"
        aria-label="Option helper text"
      />

      <button
        onClick={() => props.onDelete(props.option.id)}
        disabled={props.busy}
      >
        Remove
      </button>
    </div>
  );
}

// ---------- One question card ----------

type CardProps = {
  question: Question;
  index: number;
  total: number;
  onMove: (questionId: string, direction: "up" | "down") => void;
  onSaveLabel: (questionId: string, label: string) => void;
  onDelete: (questionId: string) => void;
  onAddOption: (questionId: string, text: string) => Promise<boolean>;
  busy: boolean;
  onDeleteOption: (questionId: string, optionId: string) => void;
  onToggleRequired: (questionId: string, required: boolean) => void;
  onSaveWordLimit: (questionId: string, maxWords: number | null) => void;
  onSaveHelper: (questionId: string, helperText: string) => void;
  onSaveOption: (
    questionId: string,
    optionId: string,
    changes: { text?: string; helperText?: string },
  ) => void;
};

function QuestionCard(props: CardProps) {
  const { question } = props;

  const [label, setLabel] = useState(question.label);
  const [helper, setHelper] = useState(question.helperText ?? "");
  const [newOption, setNewOption] = useState("");
  const [limit, setLimit] = useState(
    question.maxWords === null ? "" : String(question.maxWords),
  );

  useEffect(() => {
    setLabel(question.label);
    setHelper(question.helperText ?? "");
    setLimit(
      question.maxWords === null ? "" : String(question.maxWords),
    );
  }, [question.label, question.helperText, question.maxWords]);

  const isText =
    question.type === "short_text" || question.type === "long_text";

  const isChoice =
    question.type === "single_choice" ||
    question.type === "multiple_choice";

  function saveLimit() {
    const newLimit =
      limit.trim() === "" ? null : Number(limit);

    if (newLimit !== question.maxWords) {
      props.onSaveWordLimit(question.id, newLimit);
    }
  }

  async function addOption() {
    if (newOption.trim() === "") return;

    const ok = await props.onAddOption(question.id, newOption);

    // Clear the input only when the server confirms the save.
    if (ok) {
      setNewOption("");
    }
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
              disabled={props.busy}
              onChange={(e) =>
                props.onToggleRequired(question.id, e.target.checked)
              }
            />
            Required
          </label>

          <button
            onClick={() => props.onMove(question.id, "up")}
            disabled={props.index === 0 || props.busy}
            aria-label="Move question up"
            title="Move up"
          >
            ↑
          </button>

          <button
            onClick={() => props.onMove(question.id, "down")}
            disabled={props.index === props.total - 1 || props.busy}
            aria-label="Move question down"
            title="Move down"
          >
            ↓
          </button>
        </div>

        <button
          onClick={() => props.onDelete(question.id)}
          disabled={props.busy}
        >
          Delete question
        </button>
      </div>

      <input
        value={label}
        disabled={props.busy}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => {
          if (label !== question.label) {
            props.onSaveLabel(question.id, label);
          }
        }}
        placeholder="Type the question here"
        aria-label="Question text"
      />

      <input
        value={helper}
        disabled={props.busy}
        onChange={(e) => setHelper(e.target.value)}
        onBlur={() => {
          if (helper !== (question.helperText ?? "")) {
            props.onSaveHelper(question.id, helper);
          }
        }}
        placeholder="Helper text (optional)"
        aria-label="Helper text"
      />

      {isText && (
        <label className="word-limit">
          Word limit (optional):{" "}
          <input
            type="number"
            min={1}
            max={1000}
            value={limit}
            disabled={props.busy}
            onChange={(e) => setLimit(e.target.value)}
            onBlur={saveLimit}
            placeholder="No limit"
          />
        </label>
      )}

      {isChoice && (
        <div className="options">
          {question.options.map((option) => (
            <OptionRow
              key={option.id}
              option={option}
              busy={props.busy}
              onSave={(optionId, changes) =>
                props.onSaveOption(question.id, optionId, changes)
              }
              onDelete={(optionId) =>
                props.onDeleteOption(question.id, optionId)
              }
            />
          ))}

          <div className="option-row">
            <input
              value={newOption}
              disabled={props.busy}
              onChange={(e) => setNewOption(e.target.value)}
              placeholder="New option"
              aria-label="New option"
            />

            <button onClick={addOption} disabled={props.busy}>
              Add option
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- The whole editor ----------

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<Survey | null>(null);

  // The survey version this screen last saw. It is a ref (not state) so a queued
  // request always uses the NEWEST version, not the one from when you clicked.
  const versionRef = useRef<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState("");

  const [newType, setNewType] = useState("short_text");
  const [newLabel, setNewLabel] = useState("");

  // Load the survey and ignore results after leaving/changing the page.
  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const response = await fetch(API_URL + "/surveys/" + id);

        if (ignore) return;

        if (!response.ok) {
          setNotFound(true);
          return;
        }

        const json = await response.json();

        if (!ignore) {
          versionRef.current = json.version;
          setSurvey(json);
        }
      } catch {
        if (!ignore) {
          setMessage("Could not reach the server. Is the backend running?");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [id]);

  // Queue changes so requests are processed in the order they were made.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [pending, setPending] = useState(0);
  const busy = pending > 0;

  async function sendNow(
    method: string,
    path: string,
    body?: object,
  ): Promise<boolean> {
    try {
      const response = await fetch(API_URL + "/surveys/" + id + path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(body ?? {}), version: versionRef.current }),
      });

      let data: { error?: string } & Partial<Survey> = {};

      try {
        data = await response.json();
      } catch {
        // Keep the empty object if the response is not JSON.
      }

      if (!response.ok) {
        let text =
          data.error ??
          "Something went wrong (error " + response.status + ")";

        if (response.status === 409) {
          text +=
            " Your typing is kept. Reload the page to see the latest version.";
        }

        setMessage(text);
        return false;
      }

      versionRef.current = (data as Survey).version;
      setSurvey(data as Survey);
      return true;
    } catch {
      setMessage(
        "Could not reach the server. What you typed is still here, so try again.",
      );
      return false;
    }
  }

  function send(
    method: string,
    path: string,
    body?: object,
  ): Promise<boolean> {
    setMessage("");
    setPending((n) => n + 1);

    const result = queue.current.then(() =>
      sendNow(method, path, body),
    );

    // One failed request must not block the rest of the queue.
    queue.current = result.catch(() => undefined);

    return result.finally(() => {
      setPending((n) => n - 1);
    });
  }

  async function addQuestion() {
    const ok = await send("POST", "/questions", {
      type: newType,
      label: newLabel,
    });

    if (ok) {
      setNewLabel("");
    }
  }

  function saveLabel(questionId: string, label: string) {
    send("PATCH", "/questions/" + questionId, { label });
  }

  function saveHelper(questionId: string, helperText: string) {
    send("PATCH", "/questions/" + questionId, { helperText });
  }

  function saveOption(
    questionId: string,
    optionId: string,
    changes: { text?: string; helperText?: string },
  ) {
    send(
      "PATCH",
      "/questions/" + questionId + "/options/" + optionId,
      changes,
    );
  }

  function toggleRequired(questionId: string, required: boolean) {
    send("PATCH", "/questions/" + questionId, { required });
  }

  function saveWordLimit(
    questionId: string,
    maxWords: number | null,
  ) {
    send("PATCH", "/questions/" + questionId, { maxWords });
  }

  function deleteQuestion(questionId: string) {
    send("DELETE", "/questions/" + questionId);
  }

  function moveQuestion(
    questionId: string,
    direction: "up" | "down",
  ) {
    send("PATCH", "/questions/" + questionId + "/move", {
      direction,
    });
  }

  function addOption(
    questionId: string,
    text: string,
  ): Promise<boolean> {
    return send(
      "POST",
      "/questions/" + questionId + "/options",
      { text },
    );
  }

  function deleteOption(questionId: string, optionId: string) {
    send(
      "DELETE",
      "/questions/" + questionId + "/options/" + optionId,
    );
  }

  async function publish() {
    const ok = await send("POST", "/publish");

    if (ok) {
      navigate("/authors/surveys");
    }
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  if (notFound) {
    return (
      <p>
        Survey not found. <Link to="/authors/surveys">Back</Link>
      </p>
    );
  }

  if (!survey) {
    return <p className="error">{message}</p>;
  }

  // Only a draft can be edited.
  if (survey.status !== "draft") {
    return (
      <div>
        <h1>{survey.title}</h1>
        <p>
          This survey is {survey.status}, so it can no longer be edited.
        </p>
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
          onSaveWordLimit={saveWordLimit}
          onSaveOption={saveOption}
          onSaveHelper={saveHelper}
          busy={busy}
        />
      ))}

      <div className="card">
        <h3>Add a question</h3>

        <div className="option-row">
          <select
            value={newType}
            disabled={busy}
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
            disabled={busy}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Question text"
            aria-label="New question text"
          />

          <button onClick={addQuestion} disabled={full || busy}>
            Add question
          </button>
        </div>

        {full && (
          <p>A survey can have only {MAX_QUESTIONS} questions.</p>
        )}
      </div>

      <div className="actions">
        <Link
          className="button"
          to={"/authors/surveys/" + survey.id + "/preview"}
        >
          Preview
        </Link>

        <button onClick={publish} disabled={busy}>
          {busy ? "Saving..." : "Publish survey"}
        </button>

        <Link className="button" to="/authors/surveys">
          Back to surveys
        </Link>
      </div>
    </div>
  );
}