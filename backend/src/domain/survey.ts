import { DomainError } from "./DomainError";
import { randomUUID } from "node:crypto";
import type { SurveyStatus } from "./SurveyStatus";
import type { QuestionType } from "./Questiontype";
import {
  createQuestion,
  createOption,
  findQuestionProblems,
  type Question,
  type Option,
} from "./Question";

export const MAX_QUESTIONS = 5;

export class Survey {
  id: string;
  title: string;
  description: string;
  status: SurveyStatus;
  questions: Question[];
  createdAt: Date;

  constructor(title: string, description: string) {
    this.id = randomUUID();
    this.title = title;
    this.description = description;
    this.status = "draft";
    this.questions = [];
    this.createdAt=new Date;
  }

  // Questions can only be changed while the survey is a draft.
  private mustBeDraft() {
    if (this.status !== "draft") {
      throw new DomainError("Only a draft survey can be changed");
    }
  }

  // Find a question by its id, or stop with an error.
  private findQuestion(questionId: string): Question {
    const question = this.questions.find((q) => q.id === questionId);
    if (!question) {
      throw new DomainError("Question not found", "not_found");
    }
    return question;
  }

  addQuestion(type: QuestionType, label: string): Question {
    this.mustBeDraft();
    if (this.questions.length >= MAX_QUESTIONS) {
      throw new DomainError("A survey can have at most 5 questions");
    }
    const question = createQuestion(type, label);
    this.questions.push(question);
    return question;
  }

  updateQuestion(
    questionId: string,
    changes: { label?: string; helperText?: string; required?: boolean },
  ) {
    this.mustBeDraft();
    const question = this.findQuestion(questionId);
    if (changes.label !== undefined) question.label = changes.label;
    if (changes.helperText !== undefined) question.helperText = changes.helperText;
    if (changes.required !== undefined) question.required = changes.required;
  }

  removeQuestion(questionId: string) {
    this.mustBeDraft();
    this.findQuestion(questionId); // stops with an error if it does not exist
    this.questions = this.questions.filter((q) => q.id !== questionId);
  }
    
  moveQuestion(questionId: string, direction: "up" | "down") {
    this.mustBeDraft();
    const question = this.findQuestion(questionId);
    const index = this.questions.indexOf(question);
    const target = direction === "up" ? index - 1 : index + 1;

    if (target < 0 || target >= this.questions.length) {
      throw new DomainError("The question cannot move " + direction);
    }

    this.questions.splice(index, 1);        // take it out
    this.questions.splice(target, 0, question); // put it back one place over
  }
  addOption(questionId: string, text: string): Option {
    this.mustBeDraft();
    const question = this.findQuestion(questionId);
    const isChoice =
      question.type === "single_choice" || question.type === "multiple_choice";
    if (!isChoice) {
      throw new DomainError("Only choice questions can have options");
    }
    const option = createOption(text);
    question.options.push(option);
    return option;
  }

  removeOption(questionId: string, optionId: string) {
    this.mustBeDraft();
    const question = this.findQuestion(questionId);
    question.options = question.options.filter((o) => o.id !== optionId);
  }

  // Look at the whole survey and list everything that stops it being published.
  findPublishProblems(): string[] {
    const problems: string[] = [];

    if (this.title.trim() === "") {
      problems.push("Survey title cannot be blank");
    }

    if (this.questions.length === 0) {
      problems.push("A survey needs at least one question");
    }

    this.questions.forEach((question, index) => {
      for (const problem of findQuestionProblems(question)) {
        problems.push("Question " + (index + 1) + ": " + problem);
      }
    });

    return problems;
  }

  publish() {
    if (this.status !== "draft") {
      throw new DomainError("Only a draft survey can be published");
    }

    const problems = this.findPublishProblems();
    if (problems.length > 0) {
      throw new DomainError("Cannot publish: " + problems.join("; "));
    }

    this.status = "published";
  }
    // Only a draft can be deleted.
  assertCanBeDeleted() {
    if (this.status !== "draft") {
      throw new DomainError("Only a draft survey can be deleted");
    }
  }
  close() {
    if (this.status !== "published") {
      throw new DomainError("Only a published survey can be closed");
    }
    this.status = "closed";
  }

  // Rebuild a survey from saved data (used when loading from the database).
  static restore(data: {
    id: string;
    title: string;
    description: string;
    status: SurveyStatus;
    questions: Question[];
    createdAt: Date;
  }): Survey {
    const survey = new Survey(data.title, data.description);
    survey.id = data.id;
    survey.status = data.status;
    survey.questions = data.questions;
    survey.createdAt = data.createdAt;
    return survey;
  }
}