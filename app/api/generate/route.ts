import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { downloadFromS3 } from '@/lib/s3';
import { generateBullets } from '@/lib/anthropic';
import {
  getSession,
  updateSessionStatus,
  insertBullets,
  logAudit,
} from '@/lib/supabase';

export const maxDuration = 120; // seconds (Vercel Pro allows up to 300)

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress ?? userId;

  try {
    const { session_id } = await req.json();
    if (!session_id) {
      return NextResponse.json({ error: 'session_id is required.' }, { status: 400 });
    }

    // Fetch session from Supabase
    const session = await getSession(session_id);
    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    // Only the session owner can generate
    if (session.user_email !== userEmail) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    await updateSessionStatus(session_id, 'processing');

    // Download PDFs from S3 in parallel
    const [prevPdf, currPdf, ...interimPdfs] = await Promise.all([
      downloadFromS3(session.prev_quarter_key),
      downloadFromS3(session.curr_quarter_key),
      ...session.interim_keys.map((key) => downloadFromS3(key)),
    ]);

    // Call Anthropic
    const rawBullets = await generateBullets(
      prevPdf,
      currPdf,
      interimPdfs,
      session.fund_name,
    );

    // Persist bullets to Supabase
    const bulletsToInsert = rawBullets.map((b) => ({
      session_id,
      company_name: b.company,
      bullet_text: b.bullet,
      source_quote: b.source_quote,
      confidence: b.confidence,
      flagged: b.flagged,
      approved: false,
      edited_text: null,
      edited_at: null,
      editor_email: null,
    }));

    const savedBullets = await insertBullets(bulletsToInsert);

    await updateSessionStatus(session_id, 'ready');

    await logAudit({
      user_email: userEmail,
      action: 'generate',
      details: {
        session_id,
        fund_name: session.fund_name,
        bullet_count: savedBullets.length,
        flagged_count: savedBullets.filter((b) => b.flagged).length,
      },
    });

    return NextResponse.json({ bullets: savedBullets }, { status: 200 });
  } catch (err) {
    console.error('[generate]', err);
    return NextResponse.json(
      { error: 'Generation failed. Check server logs.' },
      { status: 500 },
    );
  }
}
