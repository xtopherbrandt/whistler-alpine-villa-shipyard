export type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }
