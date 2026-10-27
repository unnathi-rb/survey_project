// Counts the words in a text. Words are separated by spaces or new lines.
// This is the same rule the backend uses.
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed === "") return 0;
  return trimmed.split(/\s+/).length;
}
