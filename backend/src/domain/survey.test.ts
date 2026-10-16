import { describe, it, expect } from "vitest";
import { Survey } from "./survey";

describe("Survey draft", () => {
  it("starts as an empty draft", () => {
    const survey = new Survey("Week 1 check-in", "How is it going?");
    expect(survey.status).toBe("draft");
    expect(survey.questions).toEqual([]);
  });

  it("allows at most five questions", () => {
    const survey = new Survey("Title", "");
    for (let i = 1; i <= 5; i++) {
      survey.addQuestion("short_text", "Question " + i);
    }
    expect(() => survey.addQuestion("short_text", "Sixth")).toThrow(
      "at most 5 questions",
    );
    expect(survey.questions.length).toBe(5);
  });

  it("can edit a question", () => {
    const survey = new Survey("Title", "");
    const q = survey.addQuestion("short_text", "Old label");
    survey.updateQuestion(q.id, { label: "New label", required: true });
    expect(survey.questions[0]?.label).toBe("New label");
  });

  it("can remove a question", () => {
    const survey = new Survey("Title", "");
    const q = survey.addQuestion("short_text", "To delete");
    survey.removeQuestion(q.id);
    expect(survey.questions.length).toBe(0);
  });

  it("can add and remove an option on a choice question", () => {
    const survey = new Survey("Title", "");
    const q = survey.addQuestion("single_choice", "Pick one");
    const yes = survey.addOption(q.id, "Yes");
    survey.addOption(q.id, "No");
    expect(survey.questions[0]?.options.length).toBe(2);

    survey.removeOption(q.id, yes.id);
    expect(survey.questions[0]?.options.length).toBe(1);
  });

  it("does not allow options on a text question", () => {
    const survey = new Survey("Title", "");
    const q = survey.addQuestion("short_text", "Your name?");
    expect(() => survey.addOption(q.id, "Oops")).toThrow(
      "Only choice questions",
    );
  });
});
function makeValidSurvey() {
  const survey = new Survey("Week 1 check-in", "How is it going?");

  survey.addQuestion("short_text", "Your name?");

  const q = survey.addQuestion("single_choice", "How is your team?");
  survey.addOption(q.id, "Great");
  survey.addOption(q.id, "Okay");

  return survey;
}

describe("Survey publish", () => {
  it("publishes a valid draft", () => {
    const survey = makeValidSurvey();
    survey.publish();

    expect(survey.status).toBe("published");
  });

  it("rejects a blank title", () => {
    const survey = makeValidSurvey();
    survey.title = "   ";

    expect(() => survey.publish()).toThrow("title cannot be blank");
  });

  it("closes a published survey", () => {
    const survey = makeValidSurvey();

    survey.publish();
    survey.close();

    expect(survey.status).toBe("closed");
  });
});
describe("Survey reorder", () => {
  function labels(survey: Survey) {
    return survey.questions.map((q) => q.label);
  }

  it("moves a question down and back up", () => {
    const survey = new Survey("Title", "");
    const a = survey.addQuestion("short_text", "A");
    survey.addQuestion("short_text", "B");
    survey.addQuestion("short_text", "C");

    survey.moveQuestion(a.id, "down");
    expect(labels(survey)).toEqual(["B", "A", "C"]);

    survey.moveQuestion(a.id, "up");
    expect(labels(survey)).toEqual(["A", "B", "C"]);
  });

  it("cannot move the first question up or the last one down", () => {
    const survey = new Survey("Title", "");
    const a = survey.addQuestion("short_text", "A");
    const b = survey.addQuestion("short_text", "B");

    expect(() => survey.moveQuestion(a.id, "up")).toThrow("cannot move");
    expect(() => survey.moveQuestion(b.id, "down")).toThrow("cannot move");
  });

  it("cannot reorder a published survey", () => {
    const survey = new Survey("Title", "");
    const a = survey.addQuestion("short_text", "A");
    survey.addQuestion("short_text", "B");
    survey.publish();

    expect(() => survey.moveQuestion(a.id, "down")).toThrow(
      "Only a draft survey can be changed",
    );
  });
});