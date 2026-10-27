import { describe, it, expect } from "vitest";
import { Question, countWords, checkWordLimit } from "./Question";

describe("Question", () => {
  it("a good text question has no problems", () => {
    const q = new Question({ type: "short_text", label: "Your name?" });
    expect(q.findProblems()).toEqual([]);
  });

  it("a blank label is not allowed", () => {
    expect(() => new Question({ type: "short_text", label: "   " })).toThrow(
      "Question label cannot be blank",
    );
  });

  it("a choice question needs at least two options", () => {
    const q = new Question({ type: "single_choice", label: "Pick one" });
    q.addOption("Only one");
    expect(q.findProblems()).toContain(
      "A choice question needs at least two options",
    );
  });

  it("a blank option is not allowed", () => {
    const q = new Question({ type: "multiple_choice", label: "Pick" });
    expect(() => q.addOption("  ")).toThrow("cannot be empty");
  });

  it("two options with the same text are a problem", () => {
    const q = new Question({ type: "single_choice", label: "Pick" });
    q.addOption("Yes");
    q.addOption("yes");
    expect(q.findProblems()).toContain(
      "Options must be different from each other",
    );
  });
});

describe("Word limit", () => {
  it("counts words separated by spaces or new lines", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
    expect(countWords("hello")).toBe(1);
    expect(countWords("  hello   big\nworld  ")).toBe(3);
  });

  it("a new question has no word limit", () => {
    expect(new Question({ type: "short_text", label: "Name?" }).maxWords).toBeNull();
  });

  it("accepts a limit on text questions and no limit anywhere", () => {
    expect(checkWordLimit("short_text", 10)).toBeNull();
    expect(checkWordLimit("long_text", 1000)).toBeNull();
    expect(checkWordLimit("rating", null)).toBeNull();
  });

  it("rejects a limit on a question that is not text", () => {
    expect(checkWordLimit("rating", 10)).toContain("Only text questions");
    expect(checkWordLimit("single_choice", 10)).toContain("Only text questions");
  });

  it("rejects limits that are not whole numbers from 1 to 1000", () => {
    for (const bad of [0, -1, 2.5, 1001]) {
      expect(checkWordLimit("short_text", bad)).toContain("whole number");
    }
  });

  it("a bad limit is a publishing problem", () => {
    const q = new Question({ type: "short_text", label: "Name?" });
    const restored = Question.restore({
      id: q.id,
      type: q.type,
      label: q.label,
      helperText: q.helperText,
      required: q.required,
      options: [],
      maxWords: 0,
    });
    expect(restored.findProblems().length).toBe(1);
  });
});
