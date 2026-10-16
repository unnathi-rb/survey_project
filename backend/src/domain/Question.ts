import { randomUUID } from "node:crypto";
import type { QuestionType } from "./Questiontype";

export type Option = {
  id: string;
  text: string;
};

export type Question = {
  id: string;
  type: QuestionType;
  label: string;
  helperText: string;
  required: boolean;
  options: Option[];
};

// Make a new question with a unique id
export function createQuestion(type: QuestionType, label: string): Question {
  return {
    id: randomUUID(),
    type: type,
    label: label,
    helperText: "",
    required: false,
    options: [],
  };
}

// Make a new option with a unique id
export function createOption(text: string): Option {
  return { id: randomUUID(), text: text };
}

// Check one question. Returns a list of problems (empty list = all good).
export function findQuestionProblems(question: Question): string[] {
  const problems: string[] = [];

  if (question.label.trim() === "") {
    problems.push("Question label cannot be blank");
  }

  const isChoice =
    question.type === "single_choice" || question.type === "multiple_choice";

  if (isChoice) {
    if (question.options.length < 2) {
      problems.push("A choice question needs at least two options");
    }

    const seen: string[] = [];
    for (const option of question.options) {
      const text = option.text.trim().toLowerCase();
      if (text === "") {
        problems.push("Options cannot be blank");
      } else if (seen.includes(text)) {
        problems.push("Options must be different from each other");
      }
      seen.push(text);
    }
  }

  return problems;
}