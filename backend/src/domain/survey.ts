import { DomainError } from "./DomainError";
import { randomUUID } from "node:crypto";
import type { SurveyStatus } from "./SurveyStatus";
import type { QuestionType } from "./Questiontype";
import { Question, type QuestionChanges } from "./Question";
import { Option } from "./option";

export const MAX_QUESTIONS = 5;

export class Survey {
  readonly id: string;
  private _title: string;
  private _description: string;
  private _status: SurveyStatus;
  private _questions: Question[];
  private _version: number;
  // the version stored in the database right now (undefined = never saved)
  private _loadedVersion: number | undefined;
  createdAt: Date;

  constructor(
    title: string,
    description: string,
    restored?: {
      id: string;
      status: SurveyStatus;
      questions: Question[];
      createdAt: Date;
      version?: number;
    },
  ) {
    this.id = restored?.id ?? randomUUID();
    this._title = title;
    this._description = description;
    this._status = restored?.status ?? "draft";
    this._questions = [...(restored?.questions ?? [])];
    this._version = restored?.version ?? 1;
    this._loadedVersion = restored ? (restored.version ?? 1) : undefined;
    this.createdAt = restored?.createdAt ?? new Date();
  }

  get title(): string { return this._title; }
  get description(): string { return this._description; }
  get status(): SurveyStatus { return this._status; }
  get version(): number { return this._version; }
  get loadedVersion(): number | undefined { return this._loadedVersion; }

  private bumpVersion() {
    this._version++;
  }

  /** Read-only view of child entities; mutations go through Survey methods. */
  get questions(): readonly Question[] {
    return Object.freeze(this._questions.map((question) => Question.restore(question.toJSON())));
  }

  updateDetails(changes: { title?: string; description?: string }): void {
    this.mustBeDraft();
    if (changes.title !== undefined) this._title = changes.title;
    if (changes.description !== undefined) this._description = changes.description;
    this.bumpVersion();
  }

  private mustBeDraft() {
    if (this.status !== "draft") {
      throw new DomainError("Only a draft survey can be changed");
    }
  }

  private findQuestion(questionId: string): Question {
    const question = this._questions.find((q) => q.id === questionId);
    if (!question) {
      throw new DomainError("Question not found", "not_found");
    }
    return question;
  }

  addQuestion(type: QuestionType, label: string): Question {
    this.mustBeDraft();
    if (this._questions.length >= MAX_QUESTIONS) {
      throw new DomainError("A survey can have at most 5 questions");
    }
    const question = new Question({ type, label });
    this._questions.push(question);
    this.bumpVersion();
    return Question.restore(question.toJSON());
  }

  updateQuestion(questionId: string, changes: QuestionChanges) {
    this.mustBeDraft();
    const question = this.findQuestion(questionId);
    question.update(changes);
    this.bumpVersion();
  }

  removeQuestion(questionId: string) {
    this.mustBeDraft();
    this.findQuestion(questionId);
    this._questions = this._questions.filter((q) => q.id !== questionId);
    this.bumpVersion();
  }
    
  moveQuestion(questionId: string, direction: "up" | "down") {
    this.mustBeDraft();
    const question = this.findQuestion(questionId);
    const index = this._questions.indexOf(question);
    const target = direction === "up" ? index - 1 : index + 1;

    if (target < 0 || target >= this._questions.length) {
      throw new DomainError("The question cannot move " + direction);
    }

    this._questions.splice(index, 1);
    this._questions.splice(target, 0, question);
    this.bumpVersion();
  }

  addOption(questionId: string, text: string, helperText?: string): Option {
    this.mustBeDraft();
    const question = this.findQuestion(questionId);
    const option = question.addOption(text, helperText);
    this.bumpVersion();
    return option;
  }

  removeOption(questionId: string, optionId: string) {
    this.mustBeDraft();
    const question = this.findQuestion(questionId);
    question.removeOption(optionId);
    this.bumpVersion();
  }

  updateOption(
    questionId: string,
    optionId: string,
    changes: string | { text?: string; helperText?: string },
  ): void {
    this.mustBeDraft();
    const question = this.findQuestion(questionId);
    question.updateOption(optionId, changes);
    this.bumpVersion();
  }

  findPublishProblems(): string[] {
    const problems: string[] = [];

    if (this.title.trim() === "") {
      problems.push("Survey title cannot be blank");
    }

    if (this._questions.length === 0) {
      problems.push("A survey needs at least one question");
    }

    this._questions.forEach((question, index) => {
      for (const problem of question.findProblems()) {
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

    this._status = "published";
    this.bumpVersion();
  }

  assertCanBeDeleted() {
    if (this.status !== "draft") {
      throw new DomainError("Only a draft survey can be deleted");
    }
  }

  close() {
    if (this.status !== "published") {
      throw new DomainError("Only a published survey can be closed");
    }
    this._status = "closed";
    this.bumpVersion();
  }

  static restore(data: {
    id: string;
    title: string;
    description: string;
    status: SurveyStatus;
    questions: Question[];
    createdAt: Date;
    version?: number;
  }): Survey {
    return new Survey(data.title, data.description, {
      id: data.id,
      status: data.status,
      questions: data.questions,
      createdAt: data.createdAt,
      version: data.version,
    });
  }

  toJSON() {
    return {
      id: this.id,
      title: this._title,
      description: this._description,
      status: this._status,
      version: this._version,
      questions: this._questions.map((question) => question.toJSON()),
      createdAt: this.createdAt,
    };
  }
}