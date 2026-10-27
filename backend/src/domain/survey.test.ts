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
    survey.updateDetails({ title: "   " });

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

describe("Survey word limit", () => {
  it("can set and remove a word limit on a text question", () => {
    const survey = new Survey("Title", "");
    const q = survey.addQuestion("long_text", "Comments?");

    survey.updateQuestion(q.id, { maxWords: 50 });
    expect(survey.questions[0]?.maxWords).toBe(50);

    survey.updateQuestion(q.id, { maxWords: null });
    expect(survey.questions[0]?.maxWords).toBeNull();
  });

  it("rejects a limit on a question that is not text, and changes nothing", () => {
    const survey = new Survey("Title", "");
    const q = survey.addQuestion("rating", "Rate us");

    expect(() => survey.updateQuestion(q.id, { maxWords: 10, label: "New" })).toThrow(
      "Only text questions",
    );
    expect(survey.questions[0]?.maxWords).toBeNull();
    expect(survey.questions[0]?.label).toBe("Rate us");
  });

  it("rejects a limit of 0 or 2.5", () => {
    const survey = new Survey("Title", "");
    const q = survey.addQuestion("short_text", "Name?");

    expect(() => survey.updateQuestion(q.id, { maxWords: 0 })).toThrow("whole number");
    expect(() => survey.updateQuestion(q.id, { maxWords: 2.5 })).toThrow("whole number");
  });

  it("cannot change the limit after publishing", () => {
    const survey = makeValidSurvey();
    const text = survey.questions[0]!;
    survey.publish();

    expect(() => survey.updateQuestion(text.id, { maxWords: 5 })).toThrow(
      "Only a draft survey can be changed",
    );
  });
});

describe("Survey aggregate and child entities", () => {
  it("updates question details through the Survey root", () => {
    const survey = new Survey("Title", "Description");
    const question = survey.addQuestion("short_text", "Old question");

    survey.updateQuestion(question.id, {
      label: "New question",
      helperText: "Please be specific",
      required: true,
    });

    expect(survey.questions[0]?.label).toBe("New question");
    expect(survey.questions[0]?.helperText).toBe("Please be specific");
    expect(survey.questions[0]?.required).toBe(true);
  });

  it("updates option wording without changing its ID", () => {
    const survey = new Survey("Title", "");
    const question = survey.addQuestion("single_choice", "Choose one");
    const option = survey.addOption(question.id, "Old wording");
    const originalId = option.id;

    survey.updateOption(question.id, option.id, "Updated wording");

    expect(survey.questions[0]?.options[0]?.id).toBe(originalId);
    expect(survey.questions[0]?.options[0]?.text).toBe("Updated wording");
  });

  it("does not expose mutable child objects outside the aggregate", () => {
    const survey = new Survey("Title", "");
    const question = survey.addQuestion("single_choice", "Choose one");
    const option = survey.addOption(question.id, "A");
    survey.addOption(question.id, "B");

    const questionSnapshot = survey.questions[0]!;
    questionSnapshot.update({ label: "Changed outside the root" });
    questionSnapshot.options[0]!.updateText("Changed option outside the root");
    option.updateText("Changed returned option outside the root");

    expect(survey.questions[0]?.label).toBe("Choose one");
    expect(survey.questions[0]?.options[0]?.text).toBe("A");
  });

  it("does not allow child changes through the Survey after publication", () => {
    const survey = new Survey("Title", "");
    const question = survey.addQuestion("single_choice", "Choose one");
    const option = survey.addOption(question.id, "A");
    survey.addOption(question.id, "B");
    survey.publish();

    expect(() => survey.updateOption(question.id, option.id, "Changed")).toThrow(
      "Only a draft survey can be changed",
    );
    expect(survey.questions[0]?.options[0]?.text).toBe("A");
  });

  it("serializes domain classes to the existing API data shape", () => {
    const survey = new Survey("Title", "Description");
    const question = survey.addQuestion("single_choice", "Choose one");
    survey.addOption(question.id, "A");
    survey.addOption(question.id, "B");

    const json = JSON.parse(JSON.stringify(survey));
    expect(json.title).toBe("Title");
    expect(json.questions[0].label).toBe("Choose one");
    expect(json.questions[0].options[0]).toMatchObject({ text: "A" });
  });
});
describe("Survey helper text", () => {
  it("can set and clear helper text in a draft, but not after publishing", () => {
    const survey = new Survey("Title", "");
    const q = survey.addQuestion("short_text", "Name?");

    survey.updateQuestion(q.id, { helperText: "Use your first name" });
    expect(survey.questions[0]?.helperText).toBe("Use your first name");

    survey.updateQuestion(q.id, { helperText: "" });
    expect(survey.questions[0]?.helperText).toBe("");

    survey.updateQuestion(q.id, { helperText: "Back again" });
    survey.publish();
    expect(() => survey.updateQuestion(q.id, { helperText: "Too late" })).toThrow(
      "Only a draft survey can be changed",
    );
    expect(survey.questions[0]?.helperText).toBe("Back again");
  });
});