export class ApiError extends Error {
  readonly code: string;
  readonly statusCode: number | null;

  constructor(message: string, code: string, statusCode: number | null) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
