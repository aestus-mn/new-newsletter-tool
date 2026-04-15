import { createClient } from '@supabase/supabase-js';
import type { UploadSession, Bullet, AuditEntry } from '@/types';

// ─── Browser client (uses anon key, respects RLS) ─────────────────────────────
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ─── Server client (uses service role key, bypasses RLS) ──────────────────────
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ─── Session helpers ──────────────────────────────────────────────────────────
export async function createSession(
  data: Omit<UploadSession, 'id' | 'created_at'>,
): Promise<UploadSession> {
  const db = supabaseAdmin();
  const { data: row, error } = await db
    .from('sessions')
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(`Supabase createSession: ${error.message}`);
  return row as UploadSession;
}

export async function updateSessionStatus(
  id: string,
  status: UploadSession['status'],
): Promise<void> {
  const db = supabaseAdmin();
  const { error } = await db.from('sessions').update({ status }).eq('id', id);
  if (error) throw new Error(`Supabase updateSessionStatus: ${error.message}`);
}

export async function getSession(id: string): Promise<UploadSession | null> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('sessions')
    .select()
    .eq('id', id)
    .single();
  if (error) return null;
  return data as UploadSession;
}

// ─── Bullet helpers ───────────────────────────────────────────────────────────
export async function insertBullets(
  bullets: Omit<Bullet, 'id' | 'created_at'>[],
): Promise<Bullet[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('bullets')
    .insert(bullets)
    .select();
  if (error) throw new Error(`Supabase insertBullets: ${error.message}`);
  return data as Bullet[];
}

export async function getBullets(sessionId: string): Promise<Bullet[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('bullets')
    .select()
    .eq('session_id', sessionId)
    .order('company_name');
  if (error) throw new Error(`Supabase getBullets: ${error.message}`);
  return data as Bullet[];
}

export async function updateBullet(
  id: string,
  patch: Partial<Pick<Bullet, 'edited_text' | 'approved' | 'editor_email' | 'edited_at'>>,
): Promise<Bullet> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('bullets')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Supabase updateBullet: ${error.message}`);
  return data as Bullet;
}

// ─── Audit helpers ────────────────────────────────────────────────────────────
export async function logAudit(
  entry: Omit<AuditEntry, 'id' | 'created_at'>,
): Promise<void> {
  const db = supabaseAdmin();
  const { error } = await db.from('audit_log').insert(entry);
  if (error) console.error('Audit log insert failed:', error.message);
  // Non-fatal — don't rethrow
}
