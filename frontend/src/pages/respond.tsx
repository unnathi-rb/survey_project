import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "react-router-dom";
import { API_URL } from "../api";
import { countWords } from "../words";

type Option = { id: string; text: string; helperText?: string };

type Question = {
  id: string;
  type: string;
  label: string;
  helperText: string;
  required: boolean;
  options: Option[];
  maxWords: number | null;
};

type Form = {
  id: string;
  title: string;
  description: string;
  questions: Question[];
};

// An answer is text, a number, or a list of option ids.
type AnswerValue = string | number | string[];

export default function Respond() {
  const { id } = useParams();

  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState("");

  // The answers typed so far: questionId -> answer
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  // Load the form when the page opens.
  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const response = await fetch(API_URL + "/surveys/" + id + "/form");

        if (response.status === 404) {
          if (!ignore) setUnavailable("This survey is not available.");
          return;
        }
        if (!response.ok) {
          const body = await response.json();
          if (!ignore) setUnavailable(body.error ?? "This survey is not available.");
          return;
        }

        const formData = await response.json();
        if (!ignore) setForm(formData);
      } catch {
        if (!ignore) setUnavailable("Could not reach the server. Is the backend running?");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [id]);

  // How many words are typed so far in a text question.
  function wordsTyped(questionId: string) {
    const value = answers[questionId];
    return typeof value === "string" ? countWords(value) : 0;
  }

  function setAnswer(questionId: string, value: AnswerValue) {
    setAnswers({ ...answers, [questionId]: value });
  }

  // For checkboxes: add the option if it is not picked, remove it if it is.
  function toggleOption(questionId: string, optionId: string) {
    const current = answers[questionId];
    const picked = Array.isArray(current) ? current : [];

    if (picked.includes(optionId)) {
      setAnswer(questionId, picked.filter((p) => p !== optionId));
    } else {
      setAnswer(questionId, [...picked, optionId]);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    setError("");

    // Stop early if a text answer is over its word limit.
    // (The server checks this too.)
    if (form) {
      for (const question of form.questions) {
        if (
          question.maxWords !== null &&
          wordsTyped(question.id) > question.maxWords
        ) {
          setError(
            'Please shorten "' + question.label + '" to at most ' +
              question.maxWords + " words.",
          );
          return;
        }
      }
    }

    // Send only the questions that have an answer.
    const list = [];
    for (const questionId of Object.keys(answers)) {
      list.push({ questionId: questionId, value: answers[questionId] });
    }

    setSending(true);
    try {
      const response = await fetch(API_URL + "/surveys/" + id + "/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: list }),
      });

      if (!response.ok) {
        let text = "Something went wrong (error " + response.status + ")";
        try {
          const body = await response.json();
          if (body.error) text = body.error;
        } catch {
          // the answer was not JSON, so keep the message above
        }
        // Keep what the person typed, and show what went wrong.
        setError(text);
        return;
      }

      setDone(true);
    } catch {
      setError("Could not reach the server. Your answers are still here, so try again.");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <p>Loading...</p>;

  if (unavailable) {
    return (
      <div className="card">
        <h2>Survey unavailable</h2>
        <p>{unavailable}</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card">
        <h2>Thank you!</h2>
        <p>Your response has been submitted.</p>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div>
      <h1>{form.title}</h1>
      {form.description && <p>{form.description}</p>}

      <form onSubmit={handleSubmit}>
        {form.questions.map((question, index) => (
          <div key={question.id} className="card">
            <div className="card-top">
              <strong>
                {index + 1}. {question.label}
              </strong>
              {question.required && <span className="required-tag">Required</span>}
            </div>

            {question.helperText && <small>{question.helperText}</small>}

            {question.type === "short_text" && (
              <input
                aria-label={question.label}
                aria-required={question.required}
                value={(answers[question.id] as string) ?? ""}
                onChange={(e) => setAnswer(question.id, e.target.value)}
              />
            )}

            {question.type === "long_text" && (
              <textarea
                rows={4}
                aria-label={question.label}
                aria-required={question.required}
                value={(answers[question.id] as string) ?? ""}
                onChange={(e) => setAnswer(question.id, e.target.value)}
              />
            )}

            {question.maxWords !== null &&
              (question.type === "short_text" ||
                question.type === "long_text") && (
                <small
                  aria-live="polite"
                  className={
                    wordsTyped(question.id) > question.maxWords ? "error" : ""
                  }
                >
                  {wordsTyped(question.id)} / {question.maxWords} words
                </small>
              )}

            {question.type === "single_choice" &&
              question.options.map((option) => (
                <label key={option.id} className="choice">
                  <input
                    type="radio"
                    name={question.id}
                    checked={answers[question.id] === option.id}
                    onChange={() => setAnswer(question.id, option.id)}
                  />
                  {option.text}
                  {option.helperText && <small> ({option.helperText})</small>}
                </label>
              ))}

            {question.type === "multiple_choice" &&
              question.options.map((option) => {
                const current = answers[question.id];
                const checked = Array.isArray(current) && current.includes(option.id);
                return (
                  <label key={option.id} className="choice">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOption(question.id, option.id)}
                    />
                    {option.text}
                  {option.helperText && <small> ({option.helperText})</small>}
                  </label>
                );
              })}

            {question.type === "rating" && (
              <div className="rating-row">
                {[1, 2, 3, 4, 5].map((number) => (
                  <button
                    key={number}
                    type="button"
                    className={answers[question.id] === number ? "selected" : ""}
                    onClick={() => setAnswer(question.id, number)}
                  >
                    {number}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={sending}>
          {sending ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
  );
}