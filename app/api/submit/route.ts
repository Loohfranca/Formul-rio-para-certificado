import { NextResponse } from "next/server";

export const runtime = "nodejs";

function normalize(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function POST(req: Request) {
  const webhookUrl = process.env.WEBHOOK_URL;
  const chave1Correta = process.env.CHAVE_1 ?? "intenção";
  const chave2Correta = process.env.CHAVE_2 ?? "direção";

  if (!webhookUrl) {
    return NextResponse.json({ ok: false, error: "WEBHOOK_URL not configured" }, { status: 500 });
  }

  let body: { nome?: string; email?: string; chave1?: string; chave2?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const nome = (body.nome ?? "").toString();
  const email = (body.email ?? "").toString();
  const chave1 = (body.chave1 ?? "").toString();
  const chave2 = (body.chave2 ?? "").toString();

  if (!nome.trim() || nome.trim().length < 3) {
    return NextResponse.json({ ok: false, error: "Nome inválido", field: "nome" }, { status: 422 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "E-mail inválido", field: "email" }, { status: 422 });
  }
  if (normalize(chave1) !== normalize(chave1Correta)) {
    return NextResponse.json({ ok: false, error: "Palavra-chave 1 incorreta", field: "chave1" }, { status: 422 });
  }
  if (normalize(chave2) !== normalize(chave2Correta)) {
    return NextResponse.json({ ok: false, error: "Palavra-chave 2 incorreta", field: "chave2" }, { status: 422 });
  }

  const params = new URLSearchParams({
    nome: nome.trim(),
    email: email.trim(),
    chave1: chave1.trim(),
    chave2: chave2.trim(),
  });

  try {
    const res = await fetch(`${webhookUrl}?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Webhook returned ${res.status}` },
        { status: 502 },
      );
    }
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ ok: false, error: "Webhook request failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
