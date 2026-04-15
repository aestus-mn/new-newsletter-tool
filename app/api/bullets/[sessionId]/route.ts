import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import {
  getBullets,
  getSession,
  updateBullet,
  logAudit,
} from '@/lib/supabase';

// GET /api/bullets/[sessionId]
export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress ?? userId;

  const session = await getSession(params.sessionId);
  if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  if (session.user_email !== userEmail) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const bullets = await getBullets(params.sessionId);
  return NextResponse.json({ bullets });
}

// PATCH /api/bullets/[sessionId]
// Body: { bullet_id, edited_text?, approved? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress ?? userId;

  const session = await getSession(params.sessionId);
  if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  if (session.user_email !== userEmail) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const { bullet_id, edited_text, approved } = await req.json();
  if (!bullet_id) return NextResponse.json({ error: 'bullet_id required.' }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (edited_text !== undefined) {
    patch.edited_text = edited_text;
    patch.edited_at = new Date().toISOString();
    patch.editor_email = userEmail;
  }
  if (approved !== undefined) {
    patch.approved = approved;
  }

  const updated = await updateBullet(bullet_id, patch);

  const action = approved !== undefined ? 'approve_bullet' : 'edit_bullet';
  await logAudit({
    user_email: userEmail,
    action,
    details: { session_id: params.sessionId, bullet_id, ...patch },
  });

  return NextResponse.json({ bullet: updated });
}
