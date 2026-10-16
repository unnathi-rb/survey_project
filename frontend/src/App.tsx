
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Dashboard from "./pages/dashboard";
import NewSurvey from "./pages/newsurvey";
import Editor from "./pages/editor";
import Preview from "./pages/preview";
import Respond from "./pages/respond";
import Results from "./pages/Results";

export default function App() {
  const location = useLocation();
  const isRespondentPage = location.pathname.startsWith("/respond/");

  return (
    <>
      {!isRespondentPage && (
        <header className="site-header">
          <Link to="/authors/surveys">Surveys</Link>
          <Link to="/authors/surveys/new">New survey</Link>
        </header>
      )}

      <main>
        <Routes>
          <Route
            path="/"
            element={<Navigate to="/authors/surveys" replace />}
          />
          <Route path="/authors/surveys" element={<Dashboard />} />
          <Route path="/authors/surveys/new" element={<NewSurvey />} />
          <Route path="/authors/surveys/:id/edit" element={<Editor />} />
          <Route path="/authors/surveys/:id/preview" element={<Preview />} />
          <Route path="/authors/surveys/:id/results" element={<Results />} />
          <Route path="/respond/:id" element={<Respond />} />
          <Route path="*" element={<p>This page does not exist.</p>} />
        </Routes>
      </main>
    </>
  );
}