export type ActionResult<T> =
  | { data: T; error: null; warning?: string }
  | { data: null; error: string }
