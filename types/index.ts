// ─── Fund ─────────────────────────────────────────────────────────────────────
export type FundName = 'Aestus I' | 'Aestus II' | 'Aestus III';

// ─── Upload session ───────────────────────────────────────────────────────────
export interface UploadSession {
  id: string;
  user_email: string;
  fund_name: FundName;
  prev_quarter_key: string;       // S3 key
  curr_quarter_key: string;       // S3 key
  interim_keys: string[];         // S3 keys (0–N)
  created_at: string;
  status: 'uploading' | 'processing' | 'ready' | 'exported';
}

// ─── Bullet ───────────────────────────────────────────────────────────────────
export type BulletConfidence = 'high' | 'medium' | 'low';

export interface Bullet {
  id: string;
  session_id: string;
  company_name: string;
  bullet_text: string;
  source_quote: string;
  confidence: BulletConfidence;
  flagged: boolean;               // true = amber, needs human review
  approved: boolean;
  edited_text: string | null;     // set when team member edits inline
  edited_at: string | null;
  editor_email: string | null;
  created_at: string;
}

// ─── Audit log ────────────────────────────────────────────────────────────────
export interface AuditEntry {
  id: string;
  user_email: string;
  action:
    | 'upload'
    | 'generate'
    | 'edit_bullet'
    | 'approve_bullet'
    | 'export';
  details: Record<string, unknown>;
  created_at: string;
}

// ─── API request / response shapes ───────────────────────────────────────────
export interface UploadRequest {
  fund_name: FundName;
  prev_quarter: File;
  curr_quarter: File;
  interim_files: File[];
}

export interface GenerateRequest {
  session_id: string;
}

export interface GenerateResponse {
  bullets: Omit<Bullet, 'id' | 'session_id' | 'created_at'>[];
}

export interface ExportRequest {
  session_id: string;
}

export interface BulletPatchRequest {
  bullet_id: string;
  edited_text?: string;
  approved?: boolean;
}
