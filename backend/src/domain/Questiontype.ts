// The five kinds of questions a survey can have.
export type QuestionType =
  | "short_text"
  | "long_text"
  | "single_choice"
  | "multiple_choice"
  | "rating";

// Answers: "is this value one of the five question types?"
export function isQuestionType(value: unknown): value is QuestionType {
  if (value === "short_text") return true;
  if (value === "long_text") return true;
  if (value === "single_choice") return true;
  if (value === "multiple_choice") return true;
  if (value === "rating") return true;
  return false;
}

// Answers: "does this kind of question need a list of options?"
export function isChoiceType(type: QuestionType): boolean {
  if (type === "single_choice") return true;
  if (type === "multiple_choice") return true;
  return false;
}