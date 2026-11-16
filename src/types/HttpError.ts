export class HttpError extends Error {
  status: number;
  readonly details?: Record<string, unknown>;
  constructor(
    message: string,
    status: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
