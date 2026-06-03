export class GoogleAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleAuthError";
  }
}

export class GoogleFetchError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "GoogleFetchError";
  }
}
