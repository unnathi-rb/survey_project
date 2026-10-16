// One page of a longer list.
export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

// Reads a number like "3" from the address. Gives null if it is not a whole number of 1 or more.
function readPositiveWholeNumber(value: unknown, fallback: number): number | null {
  if (value === undefined) return fallback;                       // not given: use the default
  if (typeof value !== "string") return null;
  if (!/^[0-9]+$/.test(value)) return null;                       // only digits allowed
  const number = Number(value);
  if (number < 1) return null;
  return number;
}

// Reads ?page= and ?pageSize= from the address.
// Gives back either the numbers, or an error message to send to the client.
export function readPagination(query: Record<string, unknown>) {
  const page = readPositiveWholeNumber(query.page, 1);
  const pageSize = readPositiveWholeNumber(query.pageSize, DEFAULT_PAGE_SIZE);

  if (page === null) {
    return { error: "page must be a whole number of 1 or more" };
  }
  if (pageSize === null) {
    return { error: "pageSize must be a whole number of 1 or more" };
  }
  if (pageSize > MAX_PAGE_SIZE) {
    return { error: "pageSize cannot be more than " + MAX_PAGE_SIZE };
  }

  return { page: page, pageSize: pageSize };
}

// Cuts one page out of a full list.
export function paginate<T>(all: T[], page: number, pageSize: number): Page<T> {
  const start = (page - 1) * pageSize;
  const items = all.slice(start, start + pageSize);

  return {
    items: items,
    page: page,
    pageSize: pageSize,
    total: all.length,
    totalPages: Math.ceil(all.length / pageSize),
  };
}
// Builds the page answer when the database already did the slicing.
export function makePage<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): Page<T> {
  return {
    items: items,
    page: page,
    pageSize: pageSize,
    total: total,
    totalPages: Math.ceil(total / pageSize),
  };
}