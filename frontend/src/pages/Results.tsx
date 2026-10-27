import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API_URL } from "../api";

type Option = { id: string; text: string };

type Question = {
  id: string;
  type: string;
  label: string;
  options: Option[];
};

type Survey = {
  id: string;
  title: string;
  status: string;
  questions: Question[];
};

type QuestionResult = {
  questionId: string;
  label: string;
  type: string;
  answeredCount: number;
  optionCounts?: { optionId: string; text: string; count: number }[];
  average?: number | null;
  distribution?: { rating: number; count: number }[];
  textAnswers?: string[];
};

type Results = {
  totalResponses: number;
  questions: QuestionResult[];
};

type Answer = { questionId: string; value: string | number | string[] };

type ResponseItem = {
  id: string;
  submittedAt: string;
  answers: Answer[];
};

type ResponsePage = {
  items: ResponseItem[];
  page: number;
  totalPages: number;
  total: number;
};

function RatingChart(props: {
  distribution: { rating: number; count: number }[];
}) {
  const top = Math.max(1, ...props.distribution.map((d) => d.count));

  return (
    <div className="columns" role="img" aria-label="Rating distribution">
      {props.distribution.map((d) => (
        <div key={d.rating} className="column">
          <span>{d.count}</span>
          <div
            className="column-bar"
            style={{ height: (d.count / top) * 100 + "px" }}
          />
          <span>{d.rating}</span>
        </div>
      ))}
    </div>
  );
}

export default function ResultsPage() {
  const { id } = useParams();

  // The survey and the summary (loaded once)
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // The paged response list
  const [list, setList] = useState<ResponsePage | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [refresh, setRefresh] = useState(0);

  // 1. Load the survey and the summary of ALL responses.
  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!ignore) setLoading(true);
      if (!ignore) setError("");

      try {
        const surveyResponse = await fetch(API_URL + "/surveys/" + id);

        if (!surveyResponse.ok) {
          if (!ignore) setError("Survey not found.");
          return;
        }

        const surveyData = await surveyResponse.json();
        if (!ignore) setSurvey(surveyData);

        const resultsResponse = await fetch(
          API_URL + "/surveys/" + id + "/results",
        );

        if (!resultsResponse.ok) {
          if (!ignore) setError("Could not load the results.");
          return;
        }

        const resultsData = await resultsResponse.json();
        if (!ignore) setResults(resultsData);
      } catch {
        if (!ignore) setError("Could not reach the server. Is the backend running?");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [id, refresh]);

  // 2. Load one page of responses.
  useEffect(() => {
    let ignore = false;

    async function loadList() {
      if (!ignore) setListLoading(true);
      if (!ignore) setListError("");

      try {
        const url =
          API_URL +
          "/surveys/" +
          id +
          "/responses?page=" +
          page +
          "&pageSize=" +
          pageSize;

        const response = await fetch(url);

        if (!response.ok) {
          if (!ignore) setListError("Could not load the responses.");
          return;
        }

        const listData = await response.json();
        if (!ignore) setList(listData);
      } catch {
        if (!ignore) setListError("Could not reach the server.");
      } finally {
        if (!ignore) setListLoading(false);
      }
    }

    loadList();

    return () => {
      ignore = true;
    };
  }, [id, page, pageSize, refresh]);

  function changePageSize(newSize: number) {
    setPageSize(newSize);
    setPage(1);
  }

  // Turns an option id back into its text.
  function optionText(question: Question, optionId: string) {
    const option = question.options.find((o) => o.id === optionId);
    return option ? option.text : optionId;
  }

  // Turns a saved answer into something readable.
  function showAnswer(question: Question, value: string | number | string[]) {
    if (Array.isArray(value)) {
      return value.map((v) => optionText(question, v)).join(", ");
    }

    if (question.type === "single_choice") {
      return optionText(question, String(value));
    }

    return String(value);
  }

  if (loading) return <p>Loading...</p>;

  if (error) {
    return (
      <div>
        <p className="error">{error}</p>
        <Link className="button" to="/authors/surveys">
          Back to surveys
        </Link>
      </div>
    );
  }

  if (!survey || !results) return null;

  return (
    <div>
      <div className="top-row">
        <div>
          <h1>{survey.title}</h1>
          <span className={"badge " + survey.status}>{survey.status}</span>
        </div>

        <div className="actions">
          <button onClick={() => setRefresh(refresh + 1)}>Refresh</button>
          <Link className="button" to="/authors/surveys">
            Back to surveys
          </Link>
        </div>
      </div>

      {/* ---------- summary ---------- */}
      <h2>Summary</h2>

      <div className="card">
        <strong>Total responses: {results.totalResponses}</strong>
      </div>

      {results.totalResponses === 0 && (
        <p>No responses yet, so there is nothing to summarise.</p>
      )}

      {/* Text questions (like "Name of employee") have nothing to summarise,
          so only choice and rating questions get a summary card.
          Their answers are shown in the Responses list below. */}
      {results.totalResponses > 0 &&
        results.questions
          .filter(
            (question) =>
              question.type !== "short_text" && question.type !== "long_text",
          )
          .map((question) => (
          <div key={question.questionId} className="card">
            <strong>{question.label}</strong>
            <small>{question.answeredCount} answered</small>

            {question.optionCounts &&
              question.optionCounts.map((option) => {
                const percent =
                  question.answeredCount > 0
                    ? Math.round((option.count / question.answeredCount) * 100)
                    : 0;

                return (
                  <div key={option.optionId}>
                    <div className="option-row">
                      <span>{option.text}</span>
                      <span>
                        {option.count} ({percent}%)
                      </span>
                    </div>

                    <div className="bar">
                      <div
                        className="bar-fill"
                        style={{ width: percent + "%" }}
                      />
                    </div>
                  </div>
                );
              })}

            {question.type === "rating" && (
              <div>
                {question.average === null || question.average === undefined ? (
                  <p>No ratings yet.</p>
                ) : (
                  <p>
                    <span className="big-number">{question.average}</span>{" "}
                    average out of 5
                  </p>
                )}

                {question.distribution &&
                  question.average !== null &&
                  question.average !== undefined && (
                    <RatingChart distribution={question.distribution} />
                  )}
              </div>
            )}

            {question.textAnswers && (
              <div className="scroll">
                {question.textAnswers.length === 0 && <p>No answers yet.</p>}

                {question.textAnswers.map((text, index) => (
                  <p key={index} className="text-answer">
                    {text}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}

      {/* ---------- response list ---------- */}
      <h2>Responses</h2>

      <label>
        Per page:{" "}
        <select
          value={pageSize}
          onChange={(e) => changePageSize(Number(e.target.value))}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
        </select>
      </label>

      {listLoading && <p>Loading responses...</p>}
      {listError && <p className="error">{listError}</p>}

      {!listLoading && !listError && list && list.items.length === 0 && (
        <p>No responses to show.</p>
      )}

      {!listLoading && !listError && list && list.items.length > 0 && (
        <div>
          {list.items.map((item) => (
            <div key={item.id} className="card">
              <small>
                Submitted {new Date(item.submittedAt).toLocaleString()}
              </small>

              {survey.questions.map((question) => {
                const answer = item.answers.find(
                  (a) => a.questionId === question.id,
                );

                return (
                  <div key={question.id}>
                    <strong>{question.label}</strong>
                    <div>
                      {answer ? (
                        showAnswer(question, answer.value)
                      ) : (
                        <em>Skipped</em>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          <div className="pager">
            <button onClick={() => setPage(page - 1)} disabled={page <= 1}>
              Previous
            </button>

            <span>
              Page {list.page} of {list.totalPages} ({list.total} responses)
            </span>

            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= list.totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}