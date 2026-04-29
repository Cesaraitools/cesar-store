import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { orderId: string } }
) {
  const url = new URL(
    `/api/invoice-pdf/${params.orderId}`,
    process.env.NEXT_PUBLIC_SITE_URL
  );

  return NextResponse.redirect(url);
}