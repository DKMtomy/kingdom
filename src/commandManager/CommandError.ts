export class CommandError extends Error {
  constructor(message: string, public usage?: string) {
    super(message);
    this.name = "CommandError";
  }
}
