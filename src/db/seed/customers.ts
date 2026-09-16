import type { Customer } from "@/domain/types";
import { daysAgoIso } from "./helpers";

type SeedCustomer = Omit<Customer, "createdAt" | "updatedAt"> & { createdAt: string };

export const CUSTOMERS: SeedCustomer[] = [
  { id: "CUS-001", displayName: "株式会社サンプル商事", organization: "株式会社サンプル商事", maskedName: "[ORG_001]", contactPerson: "総務部 佐々木", status: "active", contactStatus: "ok", createdAt: daysAgoIso(400) },
  { id: "CUS-002", displayName: "有限会社テスト建設", organization: "有限会社テスト建設", maskedName: "[ORG_002]", contactPerson: "田村 社長", status: "active", contactStatus: "pending_reply", createdAt: daysAgoIso(300) },
  { id: "CUS-003", displayName: "合同会社デモ食品", organization: "合同会社デモ食品", maskedName: "[ORG_003]", contactPerson: "中村", status: "active", contactStatus: "ok", createdAt: daysAgoIso(220) },
  { id: "CUS-004", displayName: "サンプル物流株式会社", organization: "サンプル物流株式会社", maskedName: "[ORG_004]", contactPerson: "人事 小林", status: "active", contactStatus: "ok", createdAt: daysAgoIso(150) },
  { id: "CUS-005", displayName: "株式会社モデル設計", organization: "株式会社モデル設計", maskedName: "[ORG_005]", contactPerson: "代表 岡田", status: "prospect", contactStatus: "no_contact", createdAt: daysAgoIso(9) },
];

/** Names that appear in demo inbox text; passed to the masker as a dictionary (simulating a customer master lookup). */
export const KNOWN_PERSONS = ["佐々木", "田村", "中村", "小林", "岡田", "山田太郎", "山田 太郎", "田中", "グエン・ヴァン・アン", "グエン"];
export const KNOWN_ORGANIZATIONS = CUSTOMERS.map((c) => c.organization);
