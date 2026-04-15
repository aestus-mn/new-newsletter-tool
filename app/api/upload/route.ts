import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { randomUUID } from 'crypto';
import { uploadToS3 } from '@/lib/s3';
import { createSession, logAudit } from '@/lib/supabase';
import type { FundName } from '@/types';

const ALLOWED_FUNDS: FundName[] = ['Aestus I', 'Aestus II', 'Aestus III'];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

export async function POST(req: NextRequest) {
  // Auth check
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress ?? userId;

  try {
    const formData = await req.formData();

    // Validate fund name
    const fundName = formData.get('fund_name') as FundName;
    if (!ALLOWED_FUNDS.includes(fundName)) {
      return NextResponse.json(
        { error: 'Invalid fund name. Must be Aestus I, II, or III.' },
        { status: 400 },
      );
    }

    // Validate required files
    const prevFile = formData.get('prev_quarter') as File | null;
    const currFile = formData.get('curr_quarter') as File | null;

    if (!prevFile || !currFile) {
      return NextResponse.json(
        { error: 'prev_quarter and curr_quarter files are required.' },
        { status: 400 },
      );
    }

    if (prevFile.type !== 'application/pdf' || currFile.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'All uploaded files must be PDFs.' },
        { status: 400 },
      );
    }

    if (prevFile.size > MAX_FILE_SIZE || currFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Each file must be under ${MAX_FILE_SIZE_MB} MB.` },
        { status: 400 },
      );
    }

    // Collect optional interim PDFs
    const interimFiles: File[] = [];
    let i = 0;
    while (formData.has(`interim_${i}`)) {
      const f = formData.get(`interim_${i}`) as File;
      if (f.type !== 'application/pdf') {
        return NextResponse.json(
          { error: `interim_${i} must be a PDF.` },
          { status: 400 },
        );
      }
      if (f.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `interim_${i} exceeds ${MAX_FILE_SIZE_MB} MB.` },
          { status: 400 },
        );
      }
      interimFiles.push(f);
      i++;
    }

    // Generate session ID and S3 prefix
    const sessionId = randomUUID();
    const prefix = `sessions/${sessionId}`;

    // Upload all files to S3 in parallel
    const prevBuffer = Buffer.from(await prevFile.arrayBuffer());
    const currBuffer = Buffer.from(await currFile.arrayBuffer());
    const interimBuffers = await Promise.all(
      interimFiles.map((f) => f.arrayBuffer().then((ab) => Buffer.from(ab))),
    );

    const [prevKey, currKey, ...interimKeys] = await Promise.all([
      uploadToS3(`${prefix}/prev_quarter.pdf`, prevBuffer),
      uploadToS3(`${prefix}/curr_quarter.pdf`, currBuffer),
      ...interimBuffers.map((buf, idx) =>
        uploadToS3(`${prefix}/interim_${idx}.pdf`, buf),
      ),
    ]);

    // Create session record in Supabase
    const session = await createSession({
      user_email: userEmail,
      fund_name: fundName,
      prev_quarter_key: prevKey,
      curr_quarter_key: currKey,
      interim_keys: interimKeys,
      status: 'uploading',
    });

    // Audit log
    await logAudit({
      user_email: userEmail,
      action: 'upload',
      details: { session_id: session.id, fund_name: fundName, file_count: 2 + interimFiles.length },
    });

    return NextResponse.json({ session_id: session.id }, { status: 201 });
  } catch (err) {
    console.error('[upload]', err);
    return NextResponse.json(
      { error: 'Internal server error during upload.' },
      { status: 500 },
    );
  }
}
