import { describe, it, expect } from "vitest";
import { isSurveyStatus } from "./SurveyStatus";

describe("SurveyStatus", () => {
  it("recognises draft, published and closed", () => {
    expect(isSurveyStatus("draft")).toBe(true);
    expect(isSurveyStatus("published")).toBe(true);
    expect(isSurveyStatus("closed")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isSurveyStatus("archived")).toBe(false);
    expect(isSurveyStatus("Draft")).toBe(false);
    expect(isSurveyStatus(null)).toBe(false);
  });
});