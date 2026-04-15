import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// ─── Types returned by Claude ──────────────────────────────────────────────────
export interface RawBullet {
  company: string;
  bullet: string;
  source_quote: string;
  confidence: 'high' | 'medium' | 'low';
  flagged: boolean;
}

// ─── Main generation function ─────────────────────────────────────────────────
/**
 * Send all PDF buffers to Claude and get structured bullet points back.
 *
 * @param prevQuarterPdf  Buffer of previous quarter PDF
 * @param currQuarterPdf  Buffer of current quarter PDF
 * @param interimPdfs     Array of interim GP email PDFs (may be empty)
 * @param fundName        Name of the fund (for context)
 */
export async function generateBullets(
  prevQuarterPdf: Buffer,
  currQuarterPdf: Buffer,
  interimPdfs: Buffer[],
  fundName: string,
): Promise<RawBullet[]> {
  // Build content blocks: each PDF as a document block
  const contentBlocks: Anthropic.MessageParam['content'] = [];

  contentBlocks.push({
    type: 'text',
    text: `You are analyzing quarterly LP reports for ${fundName}, a private equity fund-of-funds.

DOCUMENT LABELS:
- Document 1: PREVIOUS quarter LP report
- Document 2: CURRENT quarter LP report
${interimPdfs.map((_, i) => `- Document ${3 + i}: Interim GP email update ${i + 1}`).join('\n')}

TASK:
Read all documents carefully. For each portfolio company mentioned in both quarterly reports:

1. Identify the company name exactly as stated.
2. Find all reported metrics: MoC (Multiple on Cost/Invested Capital), DPI (Distributions to Paid-In), TVPI (Total Value to Paid-In), gross IRR, net IRR, realizations, exits, NAV changes, and any other material financial events.
3. Calculate the CHANGE in each metric from previous quarter to current quarter.
4. Cross-reference interim GP email updates to identify the DRIVER or reason for each change.
5. Write one concise LP newsletter bullet per company following this format:
   "[Company Name]: [metric] [changed from X to Y] [driven by / following / reflecting] [specific driver from documents]."

CONFIDENCE & FLAGGING RULES:
- confidence = "high": metric delta is clearly stated in BOTH quarterly reports with matching figures
- confidence = "medium": metric stated in one report and inferred from the other, or driver from email only
- confidence = "low": metric change cannot be verified across both quarterly reports
- flagged = true when confidence is "low" OR when figures appear contradictory across documents

IMPORTANT:
- Only include companies where you can identify at least one metric change.
- Do not invent metrics or drivers — only use what is explicitly in the documents.
- Source quotes must be verbatim from the documents (max 2 sentences).
- If a company appears in interim emails but NOT in both quarterly reports, still include it but flag it.

OUTPUT FORMAT — respond with ONLY valid JSON, no prose before or after:
[
  {
    "company": "Exact Company Name",
    "bullet": "Full LP newsletter bullet text ending with a period.",
    "source_quote": "Verbatim quote from document supporting this bullet.",
    "confidence": "high|medium|low",
    "flagged": false
  }
]`,
  });

  // Previous quarter PDF
  contentBlocks.push({
    type: 'document',
    source: {
      type: 'base64',
      media_type: 'application/pdf',
      data: prevQuarterPdf.toString('base64'),
    },
  } as Anthropic.DocumentBlockParam);

  // Current quarter PDF
  contentBlocks.push({
    type: 'document',
    source: {
      type: 'base64',
      media_type: 'application/pdf',
      data: currQuarterPdf.toString('base64'),
    },
  } as Anthropic.DocumentBlockParam);

  // Interim PDFs
  for (const pdf of interimPdfs) {
    contentBlocks.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: pdf.toString('base64'),
      },
    } as Anthropic.DocumentBlockParam);
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: contentBlocks,
      },
    ],
  });

  // Extract text response
  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Strip markdown code fences if present
  const raw = textBlock.text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  let bullets: RawBullet[];
  try {
    bullets = JSON.parse(raw);
  } catch {
    throw new Error(`Claude returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  if (!Array.isArray(bullets)) {
    throw new Error('Claude response was not a JSON array');
  }

  return bullets;
}
