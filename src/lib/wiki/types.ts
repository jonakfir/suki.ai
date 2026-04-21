export type WikiSourceRef =
  | { kind: "product";   id: string }
  | { kind: "routine";   id: string }
  | { kind: "profile";   id?: string }
  | { kind: "photo";     id: string }
  | { kind: "chat";      id: string }
  | { kind: "compare";   id: string }
  | { kind: "external";  url: string };

export interface WikiPage {
  id: string;
  user_id: string;
  path: string;
  title: string;
  summary: string;
  content: string;
  version: number;
  source_refs: WikiSourceRef[];
  created_at: string;
  updated_at: string;
}

export interface WikiPageInput {
  path: string;
  title: string;
  summary: string;
  content: string;
  source_refs?: WikiSourceRef[];
}

export type WikiJobKind =
  | "product.add"
  | "product.update"
  | "product.delete"
  | "routine.update"
  | "profile.update"
  | "progress.photo"
  | "lint"
  | "seed";

export interface WikiJob {
  id: string;
  user_id: string;
  kind: WikiJobKind;
  ref_id: string | null;
  payload: Record<string, unknown>;
  status: "queued" | "running" | "done" | "failed";
  attempts: number;
  last_error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface WikiLogEntry {
  id: string;
  user_id: string;
  kind: "ingest" | "query" | "lint" | "manual";
  subject: string;
  summary: string;
  meta: Record<string, unknown>;
  created_at: string;
}
