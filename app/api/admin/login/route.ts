import { NextResponse } from "next/server";

const defaultAdminEmail = "12c1thdtheanh@gmail.com";
const defaultAdminPassword = "Theanh@123";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const adminEmail = (process.env.ADMIN_LOGIN_EMAIL || defaultAdminEmail).toLowerCase();
  const adminPassword = process.env.ADMIN_LOGIN_PASSWORD || defaultAdminPassword;

  if (email !== adminEmail || password !== adminPassword) {
    return NextResponse.json(
      { ok: false, message: "Email hoặc mật khẩu quản trị không đúng." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("tam_admin_session", "active", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
