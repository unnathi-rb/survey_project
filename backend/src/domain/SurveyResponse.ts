import { randomUUID } from "node:crypto";
import { DomainError } from "./DomainError";
import { Rating } from "./Rating";
import type { Survey } from "./survey";
import { countWords, type Question } from "./Question";

// An answer we checked and decided to keep.
export type Answer = {
  questionId: string;
  value: string | string[] | number;
};

// An answer exactly as it arrives from outside. We don't trust it yet.
export type RawAnswer = {
  questionId: string;
  value?: unknown;
};

// Did the person skip this question? What counts as "skipped" depends on the type.
// An empty list is only a skip for checkboxes. For text or rating it is the
// WRONG TYPE, so it is checked (and rejected) like any other wrong answer.
function isSkipped(question: Question, value: unknown): boolean {
  if (value === undefined || value === null) return true;

  const isText = question.type === "short_text" || question.type === "long_text";
  if (isText && typeof value === "string" && value.trim() === "") return true;

  if (question.type === "multiple_choice" && Array.isArray(value) && value.length === 0) {
    return true;
  }

  return false;
}

// Checks ONE answer (that is not skipped).
// Fine  -> { value: cleaned value }.   Wrong -> { problem: message }.
function checkAnswer(
  question: Question,
  value: unknown,
): { value: string | string[] | number } | { problem: string } {
  const name = '"' + question.label + '"';

  if (question.type === "short_text" || question.type === "long_text") {
    if (typeof value !== "string") {
      return { problem: name + ": answer must be text" };
    }
    const text = value.trim();
    if (question.maxWords !== null) {
      const words = countWords(text);
      if (words > question.maxWords) {
        return {
          problem: name + ": at most " + question.maxWords + " words (you wrote " + words + ")",
        };
      }
    }
    return { value: text };
  }

  if (question.type === "single_choice") {
    const isRealOption = question.options.some((o) => o.id === value);
    if (typeof value !== "string" || !isRealOption) {
      return { problem: name + ": not a valid option" };
    }
    return { value };
  }

  if (question.type === "multiple_choice") {
    const ids = new Set(question.options.map((o) => o.id));
    const allReal =
      Array.isArray(value) && value.every((v) => typeof v === "string" && ids.has(v));
    if (!Array.isArray(value) || !allReal) {
      return { problem: name + ": invalid options selected" };
    }
    return { value: Array.from(new Set(value as string[])) }; // a repeated choice counts once
  }

  // rating: the Rating class owns the "whole number 1 to 5" rule
  if (typeof value !== "number") {
    return { problem: name + ": rating must be a number between 1 and 5" };
  }
  try {
    return { value: Rating.create(value).value };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "invalid rating";
    return { problem: name + ": " + reason };
  }
}

export class SurveyResponse {
  readonly id: string;
  readonly surveyId: string;
  readonly answers: Answer[];
  readonly createdAt: Date;

  constructor(
    surveyId: string,
    answers: Answer[],
    restored?: { id?: string; createdAt?: Date },
  ) {
    this.id = restored?.id ?? randomUUID();
    this.surveyId = surveyId;
    this.answers = answers;
    this.createdAt = restored?.createdAt ?? new Date();
  }

  static create(survey: Survey, answers: RawAnswer[], createdAt?: Date): SurveyResponse {
    const cleaned = SurveyResponse.validate(survey, answers);
    return new SurveyResponse(survey.id, cleaned, { createdAt });
  }

  // Checks the whole submission and reports EVERY problem together.
  // Wrong survey state  -> "conflict" (409).  Wrong answers -> "invalid" (400).
  static validate(survey: Survey, answers: RawAnswer[]): Answer[] {
    if (survey.status === "draft") {
      throw new DomainError("Survey is a draft and not available yet", "conflict");
    }
    if (survey.status === "closed") {
      throw new DomainError("This survey is closed", "conflict");
    }

    const problems: string[] = [];
    const questions = survey.questions;
    const knownIds = new Set(questions.map((q) => q.id));
    const seen = new Set<string>();
    const given = new Map<string, unknown>();

    for (const answer of answers) {
      if (!knownIds.has(answer.questionId)) {
        problems.push("Unknown question: " + answer.questionId);
        continue;
      }
      if (seen.has(answer.questionId)) {
        problems.push("Question answered more than once: " + answer.questionId);
        continue;
      }
      seen.add(answer.questionId);
      given.set(answer.questionId, answer.value);
    }

    const cleaned: Answer[] = [];
    for (const question of questions) {
      const value = given.get(question.id);

      if (isSkipped(question, value)) {
        if (question.required) {
          problems.push('Question "' + question.label + '" is required');
        }
        continue; // optional and left empty: nothing to save
      }

      const result = checkAnswer(question, value);
      if ("problem" in result) {
        problems.push(result.problem);
      } else {
        cleaned.push({ questionId: question.id, value: result.value });
      }
    }

    if (problems.length > 0) {
      throw new DomainError(problems.join("; "), "invalid");
    }
    return cleaned;
  }

  toJSON() {
    return {
      id: this.id,
      surveyId: this.surveyId,
      answers: this.answers,
      submittedAt: this.createdAt, // the API name the screens use
    };
  }

  static restore(data: {
    id: string;
    surveyId: string;
    answers: Answer[];
    createdAt: Date;
  }): SurveyResponse {
    return new SurveyResponse(data.surveyId, data.answers, {
      id: data.id,
      createdAt: data.createdAt,
    });
  }
}