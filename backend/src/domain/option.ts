import { DomainError } from "./DomainError";

export class Option {
  constructor(
    public readonly id: string,
    private _text: string,
    private _helperText?: string
  ) {
    this.setText(_text);
    if (_helperText !== undefined) {
      this.setHelperText(_helperText);
    }
  }

  get text(): string {
    return this._text;
  }

  get helperText(): string | undefined {
    return this._helperText;
  }

  setText(text: string): void {
    const value = text.trim();
    if (!value) {
      throw new DomainError("Option text cannot be empty", "invalid");
    }
    this._text = value;
  }

  /** Alias for backward compatibility with tests */
  updateText(text: string): void {
    this.setText(text);
  }

  setHelperText(helperText: string | undefined): void {
    this._helperText = helperText !== undefined ? helperText.trim() : undefined;
  }

  update(changes: { text?: string; helperText?: string }): void {
    if (changes.text !== undefined) {
      this.setText(changes.text);
    }
    if (changes.helperText !== undefined) {
      this.setHelperText(changes.helperText);
    }
  }

  toJSON() {
    return {
      id: this.id,
      text: this._text,
      helperText: this._helperText,
    };
  }

  static restore(data: { id: string; text: string; helperText?: string }): Option {
    return new Option(data.id, data.text, data.helperText);
  }
}