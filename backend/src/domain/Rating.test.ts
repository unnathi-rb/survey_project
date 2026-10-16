import { describe, it, expect } from "vitest";
import { Rating } from "./Rating";

describe("Rating", () => {
  it("accepts whole numbers from 1 to 5", () => {
    for (const n of [1, 2, 3, 4, 5]) {
      expect(Rating.create(n).value).toBe(n);
    }
  });

  it("rejects 0 and 6", () => {
    expect(() => Rating.create(0)).toThrow("between 1 and 5");
    expect(() => Rating.create(6)).toThrow("between 1 and 5");
  });

  it("rejects numbers that are not whole", () => {
    expect(() => Rating.create(2.5)).toThrow("whole number");
    expect(() => Rating.create(NaN)).toThrow("whole number");
  });
});