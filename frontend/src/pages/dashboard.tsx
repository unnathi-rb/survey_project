
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "../api";

type Survey = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
};

type SurveyPage = {
  items: Survey[];
  page: number;
  totalPages: number;
  total: number;
};

export default function Dashboard() {
  const [data, setData] = useState<SurveyPage | null>(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      let url =
        API_URL + "/surveys?page=" + page + "&pageSize=" + pageSize;

      if (status !== "") {
        url += "&status=" + encodeURIComponent(status);
      }

      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Server error");
        }

        setData(await response.json());
      } catch {
        setError("Could not load surveys. Is the backend running?");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [status, page, pageSize, refresh]);

  function changeStatus(newStatus: string) {
    setStatus(newStatus);
    setPage(1);
  }

  function changePageSize(newSize: number) {
    setPageSize(newSize);
    setPage(1);
  }

  async function changeSurveyState(
    id: string,
    action: "publish" | "close"
  ) {
    setMessage("");

    try {
      const response = await fetch(
        API_URL + "/surveys/" + id + "/" + action,
        { method: "POST" }
      );

      if (!response.ok) {
        const body = await response.json();
        setMessage(body.error ?? "Something went wrong");
        return;
      }

      setRefresh((value) => value + 1);
    } catch {
      setMessage("Could not reach the server");
    }
  }

  async function removeSurvey(id: string) {
    if (!window.confirm("Delete this draft? This cannot be undone.")) {
      return;
    }

    setMessage("");

    try {
      const response = await fetch(API_URL + "/surveys/" + id, {
        method: "DELETE",
      });

      if (!response.ok) {
        let text =
          "Could not delete the survey (error " + response.status + ")";

        try {
          const body = await response.json();

          if (body.error) {
            text = body.error;
          }
        } catch {
          // Keep the fallback message if the response is not JSON.
        }

        setMessage(text);
        return;
      }

      if (data && data.items.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        setRefresh((value) => value + 1);
      }
    } catch {
      setMessage("Could not reach the server");
    }
  }

  return (
    <div className="dashboard">
      

      <section className="survey-section">
        <div className="top-row">
          <div>
            <h2>Your surveys</h2>
            <p className="section-description">
              Manage your drafts and track survey responses.
            </p>
          </div>
        </div>

        <div className="filters">
          <label>
            Status:
            <select
              value={status}
              onChange={(e) => changeStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="closed">Closed</option>
            </select>
          </label>

          <label>
            Per page:
            <select
              value={pageSize}
              onChange={(e) => changePageSize(Number(e.target.value))}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </label>
        </div>

        {message && <p className="error">{message}</p>}
        {loading && <p>Loading...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && data && data.items.length === 0 && (
          <div className="empty-state">
            <h3>No surveys found</h3>
            <p>Try another status filter to find your surveys.</p>
          </div>
        )}

        {!loading && !error && data && data.items.length > 0 && (
          <div className="survey-list">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {data.items.map((survey) => (
                    <tr key={survey.id}>
                      <td className="survey-title">{survey.title}</td>

                      <td>
                        <span className={"badge " + survey.status}>
                          {survey.status}
                        </span>
                      </td>

                      <td>
                        {new Date(survey.createdAt).toLocaleDateString()}
                      </td>

                      <td>
                        <div className="actions">
                          {survey.status === "draft" && (
                            <>
                              <Link
                                className="button"
                                to={
                                  "/authors/surveys/" +
                                  survey.id +
                                  "/edit"
                                }
                              >
                                Edit
                              </Link>

                              <button
                                onClick={() =>
                                  changeSurveyState(survey.id, "publish")
                                }
                              >
                                Publish
                              </button>

                              <button
                                onClick={() => removeSurvey(survey.id)}
                              >
                                Delete
                              </button>
                            </>
                          )}

                          {survey.status === "published" && (
                            <>
                              <Link
                                className="button"
                                to={
                                  "/authors/surveys/" +
                                  survey.id +
                                  "/results"
                                }
                              >
                                View responses
                              </Link>

                              <button
                                onClick={() =>
                                  changeSurveyState(survey.id, "close")
                                }
                              >
                                Close
                              </button>
                            </>
                          )}

                          {survey.status === "closed" && (
                            <Link
                              className="button"
                              to={
                                "/authors/surveys/" +
                                survey.id +
                                "/results"
                              }
                            >
                              View responses
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pager">
              <button
                onClick={() => setPage((currentPage) => currentPage - 1)}
                disabled={page <= 1}
              >
                Previous
              </button>

              <span>
                Page {data.page} of {data.totalPages} ({data.total} surveys)
              </span>

              <button
                onClick={() => setPage((currentPage) => currentPage + 1)}
                disabled={page >= data.totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}