export class ArquiteureError extends Error {
  constructor(message: string, public readonly code: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ArquiteureError";
  }
}

export class ValidationError extends ArquiteureError {
  constructor(message: string, cause?: unknown) {
    super(message, "VALIDATION_ERROR", cause);
  }
}

export class AIResponseError extends ArquiteureError {
  constructor(message: string, cause?: unknown) {
    super(message, "AI_RESPONSE_ERROR", cause);
  }
}

export class RuleConflictError extends ArquiteureError {
  constructor(message: string, public readonly ruleCodes: string[]) {
    super(message, "RULE_CONFLICT");
  }
}
