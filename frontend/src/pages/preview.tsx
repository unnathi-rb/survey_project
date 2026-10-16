
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API_URL } from "../api";

type Option = { id: string; text: string };

type Question = {
  id: string;
  type: string;
  label: string;
  helperText: string;
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

type AnswerValue = string | number | string[];

export default function Preview() {
  const { id } = useParams();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(API_URL + "/surveys/" + id);

        if (!response.ok) {
          setError("Survey not found.");
          return;
        }

        setSurvey(await response.json());
      } catch {
        setError("Could not reach the server. Is the backend running?");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  function setAnswer(questionId: string, value: AnswerValue) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  function toggleOption(questionId: string, optionId: string) {
    const current = answers[questionId];
    const picked = Array.isArray(current) ? current : [];

    if (picked.includes(optionId)) {
      setAnswer(questionId, picked.filter((p) => p !== optionId));
    } else {
      setAnswer(questionId, [...picked, optionId]);
    }
  }

  if (loading) return <p>Loading...</p>;

  if (error || !survey) {
    return (
      <div>
        <p className="error">{error || "Survey not found."}</p>
        <Link className="button" to="/authors/surveys">
          Back to surveys
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="notice">
        Preview only. This is how respondents will see the form. Nothing you
        type here is saved.
      </div>

      <h1>{survey.title}</h1>
      {survey.description && <p>{survey.description}</p>}

      {survey.questions.length === 0 && (
        <p>This survey has no questions yet.</p>
      )}

      {survey.questions.map((question, index) => (
        <div key={question.id} className="card">
          <div className="question-heading">
            <strong>
              {index + 1}. {question.label || "(no label yet)"}
            </strong>

            {question.required && (
              <span className="required-tag">Required</span>
            )}
          </div>

          {question.helperText && <small>{question.helperText}</small>}

          {question.type === "short_text" && (
            <input
              value={(answers[question.id] as string) ?? ""}
              onChange={(e) => setAnswer(question.id, e.target.value)}
            />
          )}

          {question.type === "long_text" && (
            <textarea
              rows={4}
              value={(answers[question.id] as string) ?? ""}
              onChange={(e) => setAnswer(question.id, e.target.value)}
            />
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
              </label>
            ))}

          {question.type === "multiple_choice" &&
            question.options.map((option) => {
              const current = answers[question.id];
              const checked =
                Array.isArray(current) && current.includes(option.id);

              return (
                <label key={option.id} className="choice">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOption(question.id, option.id)}
                  />
                  {option.text}
                </label>
              );
            })}

          {question.type === "rating" && (
            <div className="rating-row">
              {[1, 2, 3, 4, 5].map((number) => (
                <button
                  key={number}
                  type="button"
                  className={
                    answers[question.id] === number ? "selected" : ""
                  }
                  onClick={() => setAnswer(question.id, number)}
                >
                  {number}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="actions">
        <button type="button" disabled>
          Submit (disabled in preview)
        </button>

        {survey.status === "draft" ? (
          <Link
            className="button"
            to={"/authors/surveys/" + survey.id + "/edit"}
          >
            Back to editor
          </Link>
        ) : (
          <Link className="button" to="/authors/surveys">
            Back to surveys
          </Link>
        )}
      </div>
    </div>
  );
}