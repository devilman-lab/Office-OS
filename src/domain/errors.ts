export class DomainError extends Error {
  readonly code: string;
  readonly details?: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }
}

export class PermissionDeniedError extends DomainError {
  constructor(action: string, reason: string) {
    super("PERMISSION_DENIED", reason, { action });
    this.name = "PermissionDeniedError";
  }
}

export class ApprovalRequiredError extends DomainError {
  constructor(action: string) {
    super("APPROVAL_REQUIRED", action + " には担当者の承認が必要です。", { action });
    this.name = "ApprovalRequiredError";
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, issues: unknown) {
    super("VALIDATION_FAILED", message, issues);
    this.name = "ValidationError";
  }
}

export class KnowledgeUnavailableError extends DomainError {
  constructor(message = "ナレッジソース（Obsidian）に接続できません。") {
    super("KNOWLEDGE_UNAVAILABLE", message);
    this.name = "KnowledgeUnavailableError";
  }
}

export class DuplicateError extends DomainError {
  constructor(message: string, existingId: string) {
    super("DUPLICATE_DETECTED", message, { existingId });
    this.name = "DuplicateError";
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super("NOT_FOUND", resource + " (" + id + ") が見つかりません。", { resource, id });
    this.name = "NotFoundError";
  }
}

export function toErrorInfo(err: unknown): { code: string; message: string; details?: unknown } {
  if (err instanceof DomainError) return { code: err.code, message: err.message, details: err.details };
  if (err instanceof Error) return { code: "UNEXPECTED", message: err.message };
  return { code: "UNEXPECTED", message: String(err) };
}
