
//   conflict  -> 409 (the survey is in the wrong state, or the rule forbids it)
//   not_found -> 404
//   invalid   -> 400 (the data sent is wrong)
export type DomainErrorKind = "conflict" | "not_found" | "invalid";

export class DomainError extends Error {
  kind: DomainErrorKind;

  constructor(message: string, kind: DomainErrorKind = "conflict") {
    super(message);
    this.name = "DomainError";
    this.kind = kind;
  }
}
