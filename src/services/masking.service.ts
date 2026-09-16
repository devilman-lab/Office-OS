import { maskPII } from "@/security/pii-masker";
import { customerRepository } from "@/repositories/customer.repository";
import { KNOWN_PERSONS } from "@/db/seed/customers";
import type { MaskingResult } from "@/domain/types";

/**
 * Builds the masking dictionary from the customer master (organizations + contact persons)
 * and applies rule-based masking. In production the dictionary comes from the Notion customer DB
 * and the rule engine is augmented with NER.
 */
export function maskForAI(text: string): MaskingResult {
  const customers = customerRepository.list();
  const knownOrganizations = customers.map((c) => c.organization);
  const knownPersons = [
    ...customers.flatMap((c) => (c.contactPerson ? [stripTitle(c.contactPerson)] : [])),
    ...KNOWN_PERSONS,
  ];
  return maskPII(text, { knownOrganizations, knownPersons });
}

function stripTitle(name: string): string {
  return name.replace(/(総務部|人事部|人事|代表|社長|部長|課長|様|さん)/g, "").trim();
}
