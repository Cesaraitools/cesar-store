import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "cesar_admin_session";

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Failed to logout" },
      { status: 500 }
    );
  }
}