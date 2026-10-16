import { randomUUID } from "node:crypto";
import { Rating } from "./Rating";
import type { Survey } from "./survey";
import type { Question } from "./Question";

// An answer can be text, a number, or a list of option ids.
export type AnswerValue = string | number | string[];

// An answer we checked and decided to keep.
export type Answer = {
  questionId: string;
  value: AnswerValue;
};

// An answer exactly as it arrives from outside. We don't trust it yet.
export type RawAnswer = {
  questionId: string;
  value: unknown;
};

// Did the person leave this question empty?
function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

// Checks ONE answer (that is not empty) against ONE question.
// If it is fine: gives back the cleaned value and problem = null.
// If it is wrong: gives back value = null and a problem message.
function checkAnswer(question: Question, value: unknown) {
  const name = '"' + question.label + '"';

  // Text questions: the answer must be text.
  if (question.type === "short_text" || question.type === "long_text") {
    if (typeof value !== "string") {
      return { value: null, problem: name + ": answer must be text" };
    }
    return { value: value.trim(), problem: null };
  }

  // Single choice: the answer must be the id of one real option.
  if (question.type === "single_choice") {
    const isRealOption = question.options.some((o) => o.id === value);
    if (typeof value !== "string" || !isRealOption) {
      return { value: null, problem: name + ": not a valid option" };
    }
    return { value: value, problem: null };
  }

  // Multiple choice: the answer must be a list of real option ids.
  if (question.type === "multiple_choice") {
    if (!Array.isArray(value)) {
      return { value: null, problem: name + ": pick options from the list" };
    }
    const picked: string[] = [];
    for (const id of value) {
      const isRealOption = question.options.some((o) => o.id === id);
      if (typeof id !== "string" || !isRealOption) {
        return { value: null, problem: name + ": not a valid option" };
      }
      if (!picked.includes(id)) {
        picked.push(id); // same choice twice is counted once
      }
    }
    return { value: picked, problem: null };
  }

  // Rating: the only type left. It must be a number from 1 to 5.
  if (typeof value !== "number") {
    return { value: null, problem: name + ": rating must be a number" };
  }
  try {
    const rating = Rating.create(value); // throws an error if it is not 1 to 5
    return { value: rating.value, problem: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid rating";
    return { value: null, problem: name + ": " + message };
  }
}

export class SurveyResponse {
  id: string;
  surveyId: string;
  answers: Answer[];
  submittedAt: Date;

  private constructor(surveyId: string, answers: Answer[]) {
    this.id = randomUUID();
    this.surveyId = surveyId;
    this.answers = answers;
    this.submittedAt = new Date();
  }

  // The only way to make a response. It checks everything first.
  static create(survey: Survey, rawAnswers: RawAnswer[]): SurveyResponse {
    // Rule 1: only a published survey accepts answers.
    if (survey.status === "draft") {
      throw new Error("This survey is not available yet");
    }
    if (survey.status === "closed") {
      throw new Error("This survey is closed");
    }

    const problems: string[] = [];

    // Rule 2: every answer must be for a real question, and only once.
    const alreadySeen: string[] = [];
    for (const raw of rawAnswers) {
      const questionExists = survey.questions.some((q) => q.id === raw.questionId);
      if (!questionExists) {
        problems.push("Unknown question: " + raw.questionId);
      }
      if (alreadySeen.includes(raw.questionId)) {
        problems.push("Question answered more than once: " + raw.questionId);
      }
      alreadySeen.push(raw.questionId);
    }

    // Rule 3: go through each question of the survey, one by one.
    const answers: Answer[] = [];
    for (const question of survey.questions) {
      const raw = rawAnswers.find((r) => r.questionId === question.id);
      const value = raw?.value;

      if (isEmpty(value)) {
        if (question.required) {
          problems.push('"' + question.label + '": this question is required');
        }
        continue;
      }

      // Not empty: check that it is correct.
      const result = checkAnswer(question, value);
      if (result.problem !== null) {
        problems.push(result.problem);
      } else if (result.value !== null) {
        answers.push({ questionId: question.id, value: result.value });
      }
    }

    // If anything went wrong, stop and list everything at once.
    if (problems.length > 0) {
      throw new Error("Invalid response: " + problems.join("; "));
    }

    return new SurveyResponse(survey.id, answers);
  }
    // Rebuild a response from saved data (used when loading from the database).
  static restore(data: {
    id: string;
    surveyId: string;
    answers: Answer[];
    submittedAt: Date;
  }): SurveyResponse {
    const response = new SurveyResponse(data.surveyId, data.answers);
    response.id = data.id;
    response.submittedAt = data.submittedAt;
    return response;
  }
}