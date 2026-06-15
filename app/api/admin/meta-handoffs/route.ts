import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { getRedis } from "@/lib/infra/redis";

export const dynamic = "force-dynamic";

const HANDOFFS_KEY = "meta:comment:handoffs";

type StoredHandoff = {
  reason?: string;
  commentId?: string;
  postId?: string;
  messageText?: string;
  permalinkUrl?: string;
  productsCount?: number;
  bestScore?: number;
  createdAt?: string;
};

function parseHandoff(raw: unknown) {
  const text = typeof raw === "string" ? raw : JSON.stringify(raw);

  try {
    const parsed = JSON.parse(text) as StoredHandoff;
    const createdAt = parsed.createdAt || new Date().toISOString();
    const commentId = parsed.commentId || "";
    const id = `${commentId}:${createdAt}:${parsed.reason || "handoff"}`;

    return {
      id,
      raw: text,
      reason: parsed.reason || "unknown",
      commentId,
      postId: parsed.postId || "",
      messageText: parsed.messageText || "",
      permalinkUrl: parsed.permalinkUrl || "",
      productsCount:
        typeof parsed.productsCount === "number" ? parsed.productsCount : null,
      bestScore: typeof parsed.bestScore === "number" ? parsed.bestScore : null,
      createdAt,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const redis = getRedis();
    const rows = await redis.lrange(HANDOFFS_KEY, 0, 99);
    const handoffs = rows.map(parseHandoff).filter(Boolean);

    return NextResponse.json({ handoffs });
  } catch (error) {
    console.error("ADMIN META HANDOFFS READ ERROR:", error);

    return NextResponse.json(
      { error: "Failed to load Meta handoffs" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const { id } = (await request.json()) as { id?: string };
    if (!id) {
      return NextResponse.json({ error: "Missing handoff id" }, { status: 400 });
    }

    const redis = getRedis();
    const rows = await redis.lrange(HANDOFFS_KEY, 0, 99);
    const match = rows
      .map(parseHandoff)
      .find((handoff) => handoff?.id === id);

    if (!match) {
      return NextResponse.json({ ok: true, removed: 0 });
    }

    const removed = await redis.lrem(HANDOFFS_KEY, 1, match.raw);

    return NextResponse.json({ ok: true, removed });
  } catch (error) {
    console.error("ADMIN META HANDOFFS DELETE ERROR:", error);

    return NextResponse.json(
      { error: "Failed to remove Meta handoff" },
      { status: 500 }
    );
  }
}
