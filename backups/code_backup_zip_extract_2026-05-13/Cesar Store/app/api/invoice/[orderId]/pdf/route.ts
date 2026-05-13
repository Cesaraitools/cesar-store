import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { orderId: string } }
) {
  const url = new URL(req.url);

  url.pathname = `/api/invoice-pdf/${params.orderId}`;

  return NextResponse.redirect(url);
}