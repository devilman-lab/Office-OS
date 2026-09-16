import type { AIProposal } from "@/domain/types";

/** Human-facing title: replaces the masked organisation token with the matched customer name. */
export function proposalDisplayTitle(proposal: AIProposal, customerName?: string | null): string {
  const name = customerName ?? proposal.customer.matchedOrganization;
  if (!name) return proposal.caseProposal.title;
  return proposal.caseProposal.title.split(proposal.customer.maskedName).join(name).replace(/\[ORG(?:ANIZATION)?_\d{3}\]|\[ORG_NEW\]/g, name);
}
