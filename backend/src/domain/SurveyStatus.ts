// A survey is always in exactly one of these three states.
export type SurveyStatus = "draft" | "published" | "closed";

// Answers: "is this value one of the three statuses?"
export function isSurveyStatus(value: unknown): value is SurveyStatus {
  return (
    value === "draft" ||
    value === "published" ||
    value === "closed"
  );
}