import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/lib/admin/adminSessionStore";
const SESSION_COOKIE_NAME = "cesar_admin_session";

export async function POST(request: Request) {
  try {
    const response = NextResponse.json(
      { success: true },
      { status: 200 }
    );

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 0, // يمسح الكوكي فورًا
    });
const cookie = request.headers.get("cookie") || "";
const match = cookie.match(/cesar_admin_session=([^;]+)/);

if (match) {
  const value = match[1];
  const payload = value.split(":")[1];

  if (payload) {
    const token = payload.split(".")[0];
    if (token) {
      await deleteSession(token);
    }
  }
}
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to logout" },
      { status: 500 }
    );
  }
}