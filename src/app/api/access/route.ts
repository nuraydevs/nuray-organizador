import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const expected = process.env.NURAY_ACCESS_CODE;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "NURAY_ACCESS_CODE no configurado en el servidor." },
      { status: 500 },
    );
  }
  let code = "";
  try {
    const body = (await req.json()) as { code?: string };
    code = String(body?.code ?? "");
  } catch {
    return NextResponse.json({ ok: false, error: "Petición inválida" }, { status: 400 });
  }

  if (code !== expected) {
    return NextResponse.json({ ok: false, error: "Código incorrecto" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  // 30 days, ligero, no http-only — barrera interna ligera
  res.cookies.set("nuray_access", "ok", {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
  return res;
}
