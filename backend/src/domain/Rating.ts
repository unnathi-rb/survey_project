export class Rating {
  private constructor(public readonly value: number) {}

  static create(value: number): Rating {
    if (!Number.isInteger(value)) {
      throw new Error("Rating must be a whole number between 1 and 5.");
    }
    if (value < 1 || value > 5) {
      throw new Error("Rating must be between 1 and 5");
    }
    return new Rating(value);
  }
}