/**
 * The prototype has no login. A fixed demo operator represents the human reviewer.
 * In production this is replaced by the identity provider (Google Workspace SSO etc.).
 */
export const CURRENT_USER = {
  id: "user-demo-01",
  name: "佐藤（所長）",
  role: "reviewer",
} as const;

export const STAFF = ["佐藤（所長）", "鈴木", "高橋"] as const;
export type Staff = (typeof STAFF)[number];

export const AI_ACTOR = "ai-assistant";
export const AGENT_ACTOR = "ai-agent";
export const SYSTEM_ACTOR = "system";
