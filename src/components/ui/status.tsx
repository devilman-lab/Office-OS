import { Badge, type BadgeTone } from "./primitives";
import {
  CASE_STATUS_LABEL, CONFIDENCE_LABEL, INBOX_AI_STATUS_LABEL, PERMISSION_LABEL, PRIORITY_LABEL, PROPOSAL_STATUS_LABEL, SOURCE_LABEL, TASK_STATUS_LABEL,
  type CaseStatus, type Confidence, type InboxAiStatus, type Permission, type Priority, type ProposalStatus, type Relevance, type Source, type TaskStatus, type AuditResult,
} from "@/domain/enums";
import { Mail, MessageSquare, Mic, Phone, Users, PenLine, Sparkles } from "lucide-react";

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  const tone: BadgeTone = status === "new" ? "info" : status === "review" ? "warning" : status === "in_progress" ? "brand" : status === "waiting" ? "neutral" : status === "completed" ? "success" : "outline";
  return <Badge tone={tone} dot>{CASE_STATUS_LABEL[status]}</Badge>;
}
export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const tone: BadgeTone = status === "todo" ? "neutral" : status === "in_progress" ? "brand" : status === "done" ? "success" : "outline";
  return <Badge tone={tone} dot>{TASK_STATUS_LABEL[status]}</Badge>;
}
export function PriorityBadge({ priority }: { priority: Priority }) {
  const tone: BadgeTone = priority === "high" ? "danger" : priority === "medium" ? "warning" : "neutral";
  return <Badge tone={tone}>優先度 {PRIORITY_LABEL[priority]}</Badge>;
}
export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const tone: BadgeTone = confidence === "high" ? "success" : confidence === "medium" ? "warning" : "danger";
  return <Badge tone={tone} mono>Confidence: {CONFIDENCE_LABEL[confidence]}</Badge>;
}
export function RelevanceBadge({ relevance }: { relevance: Relevance }) {
  const tone: BadgeTone = relevance === "high" ? "success" : relevance === "medium" ? "warning" : "neutral";
  return <Badge tone={tone} mono>Relevance: {relevance}</Badge>;
}
export function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? <Badge tone="success" mono>Verified: YES</Badge> : <Badge tone="danger" mono>Verified: NO</Badge>;
}
export function PermissionBadge({ permission }: { permission: Permission }) {
  const tone: BadgeTone = permission === "allowed" ? "success" : permission === "approval_required" ? "warning" : "danger";
  return <Badge tone={tone} mono>{PERMISSION_LABEL[permission]}</Badge>;
}
export function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  const tone: BadgeTone = status === "pending_review" ? "warning" : status === "approved" ? "success" : "neutral";
  return <Badge tone={tone} dot>{PROPOSAL_STATUS_LABEL[status]}</Badge>;
}
export function InboxStatusBadge({ status }: { status: InboxAiStatus }) {
  const tone: BadgeTone = status === "not_processed" ? "neutral" : status === "processing" ? "info" : status === "review_required" ? "warning" : status === "registered" ? "success" : status === "failed" ? "danger" : "outline";
  return <Badge tone={tone} dot>{INBOX_AI_STATUS_LABEL[status]}</Badge>;
}
export function ResultBadge({ result }: { result: AuditResult }) {
  const tone: BadgeTone = result === "success" ? "success" : result === "warning" ? "warning" : result === "denied" ? "danger" : "danger";
  return <Badge tone={tone} mono>{result.toUpperCase()}</Badge>;
}
export function SourceBadge({ source }: { source: Source }) {
  const Icon = source === "gmail" ? Mail : source === "line_works" ? MessageSquare : source === "voice_memo" ? Mic : source === "phone_memo" ? Phone : source === "meeting_note" ? Users : source === "ai" ? Sparkles : PenLine;
  const tone: BadgeTone = source === "gmail" ? "danger" : source === "line_works" ? "success" : source === "voice_memo" ? "violet" : source === "phone_memo" ? "info" : source === "meeting_note" ? "brand" : source === "ai" ? "violet" : "neutral";
  return (
    <Badge tone={tone}>
      <Icon className="h-3 w-3" />
      {SOURCE_LABEL[source]}
    </Badge>
  );
}
export function ReadOnlyBadge() {
  return (
    <span className="inline-flex items-center gap-2">
      <Badge tone="warning" mono>READ ONLY</Badge>
      <Badge tone="danger" mono>AI WRITE DISABLED</Badge>
    </span>
  );
}
export function DemoBadge({ label = "SIMULATED" }: { label?: string }) {
  return <Badge tone="violet" mono>{label}</Badge>;
}
