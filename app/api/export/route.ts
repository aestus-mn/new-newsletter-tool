import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  LevelFormat,
  BorderStyle,
  ShadingType,
} from 'docx';
import { getBullets, getSession, logAudit } from '@/lib/supabase';
import type { Bullet } from '@/types';

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress ?? userId;

  try {
    const { session_id } = await req.json();
    if (!session_id) {
      return NextResponse.json({ error: 'session_id required.' }, { status: 400 });
    }

    const session = await getSession(session_id);
    if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    if (session.user_email !== userEmail) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const bullets = await getBullets(session_id);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Separate approved and flagged
    const approved = bullets.filter((b) => b.approved);
    const flagged = bullets.filter((b) => b.flagged && !b.approved);
    const pending = bullets.filter((b) => !b.approved && !b.flagged);

    const makeBulletPara = (b: Bullet): Paragraph => {
      const text = b.edited_text ?? b.bullet_text;
      return new Paragraph({
        numbering: { reference: 'lp-bullets', level: 0 },
        children: [
          new TextRun({
            text,
            font: 'Arial',
            size: 22, // 11pt
          }),
        ],
        spacing: { after: 120 },
      });
    };

    const children: Paragraph[] = [];

    // Title
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: `${session.fund_name} — LP Update Bullets`, font: 'Arial', bold: true })],
        spacing: { after: 200 },
      }),
    );

    // Subtitle date
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Generated: ${dateStr}  ·  `, font: 'Arial', size: 20, color: '555555' }),
          new TextRun({ text: `${approved.length} of ${bullets.length} bullets approved`, font: 'Arial', size: 20, color: '555555' }),
        ],
        spacing: { after: 480 },
      }),
    );

    // Approved section
    if (approved.length > 0) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: 'Approved Bullets', font: 'Arial', bold: true })],
          spacing: { before: 200, after: 160 },
        }),
      );
      approved.forEach((b) => children.push(makeBulletPara(b)));
    }

    // Needs review section
    if (flagged.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '' })],
          spacing: { after: 200 },
        }),
      );
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: '⚠ Needs Review (AI Confidence: Low)',
              font: 'Arial',
              bold: true,
              color: 'B45309',
            }),
          ],
          spacing: { before: 200, after: 160 },
        }),
      );
      flagged.forEach((b) => children.push(makeBulletPara(b)));
    }

    // Pending (not approved, not flagged)
    if (pending.length > 0) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 200 } }),
      );
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: 'Pending Approval', font: 'Arial', bold: true })],
          spacing: { before: 200, after: 160 },
        }),
      );
      pending.forEach((b) => children.push(makeBulletPara(b)));
    }

    // Footer note
    children.push(
      new Paragraph({ children: [new TextRun({ text: '' })], spacing: { before: 480 } }),
    );
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'INTERNAL & CONFIDENTIAL — For authorised Aestus team use only',
            font: 'Arial',
            size: 18,
            color: '888888',
            italics: true,
          }),
        ],
      }),
    );

    const doc = new Document({
      numbering: {
        config: [
          {
            reference: 'lp-bullets',
            levels: [
              {
                level: 0,
                format: LevelFormat.BULLET,
                text: '•',
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 720, hanging: 360 } } },
              },
            ],
          },
        ],
      },
      styles: {
        default: {
          document: { run: { font: 'Arial', size: 22 } },
        },
        paragraphStyles: [
          {
            id: 'Heading1',
            name: 'Heading 1',
            basedOn: 'Normal',
            next: 'Normal',
            quickFormat: true,
            run: { size: 36, bold: true, font: 'Arial', color: '1E3A5F' },
            paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 },
          },
          {
            id: 'Heading2',
            name: 'Heading 2',
            basedOn: 'Normal',
            next: 'Normal',
            quickFormat: true,
            run: { size: 28, bold: true, font: 'Arial', color: '2E4E8A' },
            paragraph: { spacing: { before: 180, after: 180 }, outlineLevel: 1 },
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              size: { width: 12240, height: 15840 },
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          children,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    await logAudit({
      user_email: userEmail,
      action: 'export',
      details: {
        session_id,
        approved_count: approved.length,
        total_count: bullets.length,
      },
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="lp-bullets-${session_id.slice(0, 8)}.docx"`,
      },
    });
  } catch (err) {
    console.error('[export]', err);
    return NextResponse.json({ error: 'Export failed.' }, { status: 500 });
  }
}
