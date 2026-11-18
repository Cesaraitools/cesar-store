import { createServiceRoleClient } from "../supabase/runtime";

export type MetaPostProductResolution = {
  productIds: string[];
  source: "publisher_queue" | "post_product_url" | "none";
};

const PRODUCT_ID_PATTERN =
  /(?:https?:\/\/[^\s<>"']+)?\/product\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?=$|[/?#\s<>"'])/giu;

function uniqueIds(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
}

export function extractProductIdsFromMetaPostContext(value: string) {
  return uniqueIds(
    Array.from(value.matchAll(PRODUCT_ID_PATTERN), (match) => match[1])
  );
}

export function buildMetaPostIdCandidates(pageId: string, postId: string) {
  const normalizedPageId = pageId.trim();
  const normalizedPostId = postId.trim();

  if (!normalizedPostId) return [];

  return uniqueIds([
    normalizedPostId,
    normalizedPageId && !normalizedPostId.startsWith(`${normalizedPageId}_`)
      ? `${normalizedPageId}_${normalizedPostId}`
      : "",
  ]);
}

export async function resolveMetaPostProducts(input: {
  pageId: string;
  postId: string;
  postContext: string;
}): Promise<MetaPostProductResolution> {
  const externalPostIds = buildMetaPostIdCandidates(input.pageId, input.postId);

  if (externalPostIds.length) {
    try {
      const supabase = createServiceRoleClient();
      const { data, error } = await supabase
        .from("social_post_queue")
        .select("external_post_id,product_id,product_ids,published_at")
        .eq("platform", "facebook")
        .eq("status", "published")
        .in("external_post_id", externalPostIds)
        .order("published_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      const matchingRows = (data || []).sort((left, right) => {
        const leftExact = left.external_post_id === input.postId ? 1 : 0;
        const rightExact = right.external_post_id === input.postId ? 1 : 0;
        return rightExact - leftExact;
      });
      const row = matchingRows[0];

      if (row) {
        const productIds = uniqueIds(
          Array.isArray(row.product_ids) && row.product_ids.length
            ? row.product_ids
            : [row.product_id]
        );

        if (productIds.length) {
          return { productIds, source: "publisher_queue" };
        }
      }
    } catch (error) {
      console.error("META POST PRODUCT MAP LOOKUP ERROR:", error);
    }
  }

  const productIds = extractProductIdsFromMetaPostContext(input.postContext);
  if (productIds.length) {
    return { productIds, source: "post_product_url" };
  }

  return { productIds: [], source: "none" };
}
