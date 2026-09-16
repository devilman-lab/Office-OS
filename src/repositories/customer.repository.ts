import { getDb, nextId } from "@/db/client";
import type { Customer } from "@/domain/types";
import { nowIso } from "@/lib/utils";

type Row = {
  id: string; display_name: string; organization: string; masked_name: string; contact_person: string | null;
  status: string; contact_status: string; created_at: string; updated_at: string;
};

function map(r: Row): Customer {
  return {
    id: r.id,
    displayName: r.display_name,
    organization: r.organization,
    maskedName: r.masked_name,
    contactPerson: r.contact_person,
    status: r.status as Customer["status"],
    contactStatus: r.contact_status as Customer["contactStatus"],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const customerRepository = {
  list(): Customer[] {
    return (getDb().prepare("SELECT * FROM customers ORDER BY created_at ASC").all() as Row[]).map(map);
  },
  findById(id: string): Customer | null {
    const r = getDb().prepare("SELECT * FROM customers WHERE id = ?").get(id) as Row | undefined;
    return r ? map(r) : null;
  },
  findByOrganization(org: string): Customer | null {
    const r = getDb().prepare("SELECT * FROM customers WHERE organization = ?").get(org) as Row | undefined;
    return r ? map(r) : null;
  },
  search(q: string): Customer[] {
    const like = `%${q}%`;
    return (getDb().prepare("SELECT * FROM customers WHERE display_name LIKE ? OR organization LIKE ? OR contact_person LIKE ? LIMIT 10").all(like, like, like) as Row[]).map(map);
  },
  create(input: Omit<Customer, "id" | "createdAt" | "updatedAt"> & { id?: string }): Customer {
    const db = getDb();
    const id = input.id ?? nextId(db, "CUS", 3);
    const ts = nowIso();
    db.prepare(
      `INSERT INTO customers(id, display_name, organization, masked_name, contact_person, status, contact_status, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
    ).run(id, input.displayName, input.organization, input.maskedName, input.contactPerson, input.status, input.contactStatus, ts, ts);
    return this.findById(id)!;
  },
  count(): number {
    return (getDb().prepare("SELECT COUNT(*) c FROM customers").get() as { c: number }).c;
  },
};
