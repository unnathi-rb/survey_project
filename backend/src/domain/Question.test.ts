import { describe, it, expect } from "vitest";
import { createQuestion, createOption, findQuestionProblems } from "./Question";

describe("Question", () => {
  it("a good text question has no problems", () => {
    const q = createQuestion("short_text", "Your name?");
    expect(findQuestionProblems(q)).toEqual([]);
  });

  it("a blank label is a problem", () => {
    const q = createQuestion("short_text", "   ");
    expect(findQuestionProblems(q)).toContain("Question label cannot be blank");
  });

  it("a choice question needs at least two options", () => {
    const q = createQuestion("single_choice", "Pick one");
    q.options = [createOption("Only one")];
    expect(findQuestionProblems(q)).toContain(
      "A choice question needs at least two options",
    );
  });

  it("a blank option is a problem", () => {
    const q = createQuestion("multiple_choice", "Pick");
    q.options = [createOption("Red"), createOption("  ")];
    expect(findQuestionProblems(q)).toContain("Options cannot be blank");
  });

  it("two options with the same text are a problem", () => {
    const q = createQuestion("single_choice", "Pick");
    q.options = [createOption("Yes"), createOption("yes")];
    expect(findQuestionProblems(q)).toContain(
      "Options must be different from each other",
    );
  });
});