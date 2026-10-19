import { DomainError } from "./DomainError";
export class Rating {
  private constructor(public readonly value: number) {}

  static create(value: number): Rating {
    if (!Number.isInteger(value)) {
      throw new DomainError("Rating must be a whole number between 1 and 5.", "invalid");
    }
    if (value < 1 || value > 5) {
      throw new DomainError("Rating must be between 1 and 5", "invalid");
    }
    return new Rating(value);
  }
}