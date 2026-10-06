import { createClient } from '@/lib/supabase/server';
import type { ConditionGrade } from '@clean-crep/shared';

// AI condition grade (docs/VISION.md, Phase 2). Staff-only: grades one order
// photo 1–10 with a vision model and saves it on the order's pair as a
// pair_events 'grade' row. Needs ANTHROPIC_API_KEY and GRADE_MODEL on Vercel;
// without them it answers 503 and the staff page says grading isn't set up.

const RUBRIC = `You grade the condition of footwear (sneakers, Clarks, boots) or caps from one photo for a shoe-cleaning business in Jamaica.
Score 1-10:
10 = like new / deadstock. 9 = clean, barely worn. 8 = clean with light wear.
7 = light dirt or creasing. 6 = visible dirt, scuffs or mild sole yellowing.
5 = dirty: stains, grime on midsoles, noticeable yellowing. 4 = heavily soiled.
3 = heavy staining plus wear damage. 2 = damaged (tears, sole separation). 1 = beyond restoration.
Judge only what is visible. Lighting and background don't count.
Reply with JSON only, no prose: {"score": <1-10 integer>, "summary": "<one short sentence a customer would read>", "issues": ["<short issue>", ...]}
If the photo does not show footwear or a cap, reply {"score": null, "summary": "Not a shoe photo", "issues": []}.`;

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.GRADE_MODEL;
  if (!key || !model) return Response.json({ error: 'not_configured' }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { photoId?: string } | null;
  if (!body?.photoId) return Response.json({ error: 'bad_request' }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { data: staff } = await supabase.from('staff').select('id').eq('id', user.id).maybeSingle();
  if (!staff) return Response.json({ error: 'forbidden' }, { status: 403 });

  const { data: photo } = await supabase
    .from('order_photos')
    .select('id, kind, storage_path, order:orders(id, item_name, pair_id)')
    .eq('id', body.photoId)
    .maybeSingle();
  const order = (photo?.order ?? null) as { id: string; item_name: string; pair_id: string | null } | null;
  if (!photo || !order) return Response.json({ error: 'not_found' }, { status: 404 });
  if (!order.pair_id) return Response.json({ error: 'no_pair' }, { status: 409 });

  const { data: file, error: dlErr } = await supabase.storage.from('order-photos').download(photo.storage_path);
  if (dlErr || !file) return Response.json({ error: 'photo_unavailable' }, { status: 502 });
  const mediaType = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) ? file.type : 'image/jpeg';
  const data = Buffer.from(await file.arrayBuffer()).toString('base64');

  const ai = await fetch(`${process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com'}/v1/messages`, {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      system: RUBRIC,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
            { type: 'text', text: `${photo.kind === 'before' ? 'Before' : 'After'} cleaning photo of: ${order.item_name}` },
          ],
        },
      ],
    }),
  });
  if (!ai.ok) {
    console.error('[grade] model error', ai.status, (await ai.text()).slice(0, 300));
    return Response.json({ error: 'model_error' }, { status: 502 });
  }
  const out = (await ai.json()) as { content?: { type: string; text?: string }[] };
  const text = out.content?.find((c) => c.type === 'text')?.text ?? '';
  let parsed: { score?: unknown; summary?: unknown; issues?: unknown };
  try {
    parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  } catch {
    return Response.json({ error: 'unreadable' }, { status: 502 });
  }
  const score = typeof parsed.score === 'number' ? Math.round(parsed.score) : null;
  if (score === null || score < 1 || score > 10) return Response.json({ error: 'not_footwear', summary: String(parsed.summary ?? '') }, { status: 422 });

  const grade: ConditionGrade = {
    stage: photo.kind as ConditionGrade['stage'],
    score,
    summary: String(parsed.summary ?? '').slice(0, 200),
    issues: Array.isArray(parsed.issues) ? parsed.issues.map(String).slice(0, 6) : [],
    photo_id: photo.id,
  };
  const { error: insErr } = await supabase.from('pair_events').insert({ pair_id: order.pair_id, kind: 'grade', order_id: order.id, data: grade });
  if (insErr) return Response.json({ error: 'save_failed' }, { status: 500 });
  return Response.json(grade);
}
