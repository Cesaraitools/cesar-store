import {
  acceptsMarkdown,
  buildNotFoundMarkdown,
} from "@/lib/agent-discovery";

type RouteContext = {
  params: {
    slug: string[];
  };
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function GET(request: Request, { params }: RouteContext) {
  const url = new URL(request.url);
  const pathname = `/${params.slug.join("/")}`;

  if (acceptsMarkdown(request.headers.get("accept"))) {
    return new Response(buildNotFoundMarkdown(pathname, url.origin), {
      status: 404,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Language": "ar-EG",
        "Cache-Control": "public, max-age=60",
        Vary: "Accept",
      },
    });
  }

  if (pathname.startsWith("/api/")) {
    return Response.json(
      {
        error: "Not Found",
        message: `No API route exists at ${pathname}`,
        documentation: `${url.origin}/llms.txt`,
      },
      { status: 404 }
    );
  }

  const safePath = escapeHtml(pathname);
  const body = `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>الصفحة غير موجودة | Cesar Store</title></head>
<body style="font-family:system-ui,sans-serif;margin:0;background:#f8fafc;color:#0f172a">
  <main style="max-width:720px;margin:10vh auto;padding:32px">
    <p style="font-weight:800;color:#3448e5">404</p>
    <h1>الصفحة غير موجودة</h1>
    <p>لم يتم العثور على المسار <code dir="ltr">${safePath}</code>. يمكنك متابعة التصفح من المتجر أو خريطة الموقع.</p>
    <p><a href="/shop">تصفح المتجر</a> · <a href="/sitemap.xml">خريطة الموقع</a> · <a href="/">الرئيسية</a></p>
  </main>
</body>
</html>`;

  return new Response(body, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Language": "ar-EG",
      "Cache-Control": "public, max-age=60",
      Vary: "Accept",
    },
  });
}

export function HEAD() {
  return new Response(null, {
    status: 404,
    headers: {
      "Cache-Control": "public, max-age=60",
      Vary: "Accept",
    },
  });
}
