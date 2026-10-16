import { describe, it, expect } from "vitest";
import { isQuestionType, isChoiceType } from "./Questiontype";

describe("QuestionType", () => {
  it("recognises the five valid types", () => {
    for (const t of ["short_text", "long_text", "single_choice", "multiple_choice", "rating"]) {
      expect(isQuestionType(t)).toBe(true);
    }
  });

  it("rejects unknown values", () => {
    expect(isQuestionType("banana")).toBe(false);
    expect(isQuestionType(5)).toBe(false);
    expect(isQuestionType(undefined)).toBe(false);
  });

  it("knows which types need options", () => {
    expect(isChoiceType("single_choice")).toBe(true);
    expect(isChoiceType("multiple_choice")).toBe(true);
    expect(isChoiceType("rating")).toBe(false);
    expect(isChoiceType("short_text")).toBe(false);
  });
});