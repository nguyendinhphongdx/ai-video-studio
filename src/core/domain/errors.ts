/** Error whose message is short, in Vietnamese and safe for the UI; `detail` is for logs only. */
export class UserFacingError extends Error {
  constructor(
    message: string,
    public readonly detail?: string,
  ) {
    super(message);
  }
}
