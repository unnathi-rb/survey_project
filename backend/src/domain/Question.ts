import { randomUUID } from "node:crypto";
import type { QuestionType } from "./Questiontype";
import { Option } from "./option";
import { DomainError } from "./DomainError";

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

// Is this text within the word limit? (no limit means always fine)
export function isWithinWordLimit(text: string, maxWords: number | null): boolean {
  if (maxWords === null) return true;
  return countWords(text) <= maxWords;
}

// Checks a word limit SETTING. Gives back a message if it is wrong, or null if fine.
export function checkWordLimit(
  type: QuestionType,
  maxWords: number | null,
): string | null {
  if (maxWords === null) return null;
  if (type !== "short_text" && type !== "long_text") {
    return "Only text questions can have a word limit";
  }
  if (!Number.isInteger(maxWords) || maxWords < 1 || maxWords > 1000) {
    return "Word limit must be a whole number from 1 to 1000";
  }
  return null;
}

export interface QuestionChanges {
  label?: string;
  helperText?: string;
  required?: boolean;
  maxWords?: number | null;
}

export class Question {
  readonly id: string;
  private _type: QuestionType;
  private _label: string = "";
  private _helperText: string = "";
  private _required: boolean = false;
  private _options: Option[] = [];
  private _maxWords: number | null = null;

  constructor(
    data: {
      type: QuestionType;
      label: string;
      helperText?: string;
      required?: boolean;
      options?: Option[];
      maxWords?: number | null;
    },
    restoredId?: string,
  ) {
    this.id = restoredId ?? randomUUID();
    this._type = data.type;
    this.setLabel(data.label);
    this._helperText = data.helperText ?? "";
    this._required = data.required ?? false;
    this._options = [...(data.options ?? [])];
    this._maxWords = data.maxWords ?? null;
  }

  get type(): QuestionType { return this._type; }
  get label(): string { return this._label; }
  get helperText(): string { return this._helperText; }
  get required(): boolean { return this._required; }
  get maxWords(): number | null { return this._maxWords; }

  get options(): readonly Option[] {
    return Object.freeze(this._options.map((o) => Option.restore(o.toJSON())));
  }

  private isChoiceType(): boolean {
    return this._type === "single_choice" || this._type === "multiple_choice";
  }

  setLabel(label: string): void {
    const value = label.trim();
    if (!value) {
      throw new DomainError("Question label cannot be blank", "invalid");
    }
    this._label = value;
  }

  // Checks everything first, and only then changes anything.
  // So a rejected update leaves the question exactly as it was.
  update(changes: QuestionChanges): void {
    let label = this._label;
    if (changes.label !== undefined) {
      label = changes.label.trim();
      if (!label) {
        throw new DomainError("Question label cannot be blank", "invalid");
      }
    }

    let maxWords = this._maxWords;
    if (changes.maxWords !== undefined) {
      const problem = checkWordLimit(this._type, changes.maxWords);
      if (problem) {
        throw new DomainError(problem, "invalid");
      }
      maxWords = changes.maxWords;
    }

    this._label = label;
    this._maxWords = maxWords;
    if (changes.helperText !== undefined) {
      this._helperText = changes.helperText;
    }
    if (changes.required !== undefined) {
      this._required = changes.required;
    }
  }

  addOption(text: string, helperText?: string): Option {
    if (!this.isChoiceType()) {
      throw new DomainError("Only choice questions can have options", "invalid");
    }
    const option = new Option(randomUUID(), text, helperText);
    this._options.push(option);
    return Option.restore(option.toJSON());
  }

  removeOption(optionId: string): void {
    if (!this.isChoiceType()) {
      throw new DomainError("Only choice questions can have options", "invalid");
    }
    const index = this._options.findIndex((o) => o.id === optionId);
    if (index === -1) {
      throw new DomainError("Option not found", "not_found");
    }
    this._options.splice(index, 1);
  }

  updateOption(
    optionId: string,
    changes: { text?: string; helperText?: string } | string,
  ): void {
    if (!this.isChoiceType()) {
      throw new DomainError("Only choice questions can have options", "invalid");
    }
    const option = this._options.find((o) => o.id === optionId);
    if (!option) {
      throw new DomainError("Option not found", "not_found");
    }
    if (typeof changes === "string") {
      option.setText(changes);
    } else {
      option.update(changes);
    }
  }

  // Everything that stops this question from being published.
  findProblems(): string[] {
    const problems: string[] = [];

    if (!this._label.trim()) {
      problems.push("Question label cannot be blank");
    }

    if (this.isChoiceType()) {
      if (this._options.length < 2) {
        problems.push("A choice question needs at least two options");
      }

      const seen = new Set<string>();
      for (const option of this._options) {
        const key = option.text.trim().toLowerCase();
        if (seen.has(key)) {
          problems.push("Options must be different from each other");
          break;
        }
        seen.add(key);
      }
    }

    const limitProblem = checkWordLimit(this._type, this._maxWords);
    if (limitProblem) {
      problems.push(limitProblem);
    }

    return problems;
  }

  toJSON() {
    return {
      id: this.id,
      type: this._type,
      label: this._label,
      helperText: this._helperText,
      required: this._required,
      options: this._options.map((o) => o.toJSON()),
      maxWords: this._maxWords,
    };
  }

  static restore(data: {
    id: string;
    type: QuestionType;
    label: string;
    helperText?: string;
    required?: boolean;
    options?: { id: string; text: string; helperText?: string }[];
    maxWords?: number | null;
  }): Question {
    return new Question(
      {
        type: data.type,
        label: data.label,
        helperText: data.helperText,
        required: data.required,
        options: (data.options || []).map((o) => Option.restore(o)),
        maxWords: data.maxWords,
      },
      data.id,
    );
  }
}