import { createHmac } from "crypto";
import { requireMetaPublisherConfig } from "./config";
import type { SocialPlatform } from "./types";

type MetaSuccess = {
  externalPostId: string;
  externalPostUrl: string;
};

type MetaResponse = {
  id?: string;
  name?: string;
  username?: string;
  post_id?: string;
  status_code?: string;
  status?: string;
  permalink?: string;
  instagram_business_account?: {
    id?: string;
    username?: string;
  };
  data?: {
    app_id?: string;
    is_valid?: boolean;
    scopes?: string[];
    expires_at?: number;
    data_access_expires_at?: number;
  };
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
};

function metaError(payload: MetaResponse, fallback: string) {
  const message = payload.error?.message || fallback;
  const code = payload.error?.code ? ` (${payload.error.code})` : "";
  return new Error(`${message}${code}`);
}
function appSecretProof(accessToken: string, appSecret: string) {
  return createHmac("sha256", appSecret).update(accessToken).digest("hex");
}

async function postForm(url: string, values: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(values),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const payload = (await response.json()) as MetaResponse;

  if (!response.ok || payload.error) {
    throw metaError(payload, `Meta request failed with ${response.status}`);
  }

  return payload;
}

async function getJson(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const payload = (await response.json()) as MetaResponse;

  if (!response.ok || payload.error) {
    throw metaError(payload, `Meta request failed with ${response.status}`);
  }

  return payload;
}

async function waitForInstagramContainer(
  baseUrl: string,
  containerId: string,
  accessToken: string,
  appSecret: string
) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const status = await getJson(
      `${baseUrl}/${encodeURIComponent(containerId)}?fields=status_code,status&access_token=${encodeURIComponent(
        accessToken
      )}&appsecret_proof=${encodeURIComponent(appSecretProof(accessToken, appSecret))}`
    );

    if (status.status_code === "FINISHED") return;
    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
      throw new Error(status.status || `Instagram container ${status.status_code}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  throw new Error("Instagram media container was not ready in time.");
}

async function publishFacebook(
  imageUrl: string,
  caption: string
): Promise<MetaSuccess> {
  const config = requireMetaPublisherConfig("facebook");
  const baseUrl = `https://graph.facebook.com/${config.graphApiVersion}`;
  const payload = await postForm(
    `${baseUrl}/${encodeURIComponent(config.pageId)}/photos`,
    {
      url: imageUrl,
      message: caption,
      published: "true",
      access_token: config.accessToken,
      appsecret_proof: appSecretProof(config.accessToken, config.appSecret),
    }
  );
  const externalPostId = payload.post_id || payload.id || "";

  if (!externalPostId) {
    throw new Error("Meta did not return a Facebook post id.");
  }

  return {
    externalPostId,
    externalPostUrl: `https://www.facebook.com/${externalPostId}`,
  };
}

async function publishInstagram(
  imageUrl: string,
  caption: string
): Promise<MetaSuccess> {
  const config = requireMetaPublisherConfig("instagram");
  const baseUrl = `https://graph.facebook.com/${config.graphApiVersion}`;
  const container = await postForm(
    `${baseUrl}/${encodeURIComponent(config.instagramUserId)}/media`,
    {
      image_url: imageUrl,
      caption,
      access_token: config.accessToken,
      appsecret_proof: appSecretProof(config.accessToken, config.appSecret),
    }
  );

  if (!container.id) {
    throw new Error("Meta did not return an Instagram media container id.");
  }

  await waitForInstagramContainer(
    baseUrl,
    container.id,
    config.accessToken,
    config.appSecret
  );

  const published = await postForm(
    `${baseUrl}/${encodeURIComponent(config.instagramUserId)}/media_publish`,
    {
      creation_id: container.id,
      access_token: config.accessToken,
      appsecret_proof: appSecretProof(config.accessToken, config.appSecret),
    }
  );

  if (!published.id) {
    throw new Error("Meta did not return an Instagram media id.");
  }

  const media = await getJson(
    `${baseUrl}/${encodeURIComponent(published.id)}?fields=permalink&access_token=${encodeURIComponent(
      config.accessToken
    )}&appsecret_proof=${encodeURIComponent(
      appSecretProof(config.accessToken, config.appSecret)
    )}`
  );

  return {
    externalPostId: published.id,
    externalPostUrl: media.permalink || "https://www.instagram.com/",
  };
}

export async function publishToMeta(input: {
  platform: SocialPlatform;
  imageUrl: string;
  caption: string;
}) {
  if (input.platform === "facebook") {
    return publishFacebook(input.imageUrl, input.caption);
  }

  return publishInstagram(input.imageUrl, input.caption);
}

export async function testMetaPublisherConnection(
  platforms: SocialPlatform[]
) {
  const primaryPlatform = platforms[0];
  if (!primaryPlatform) throw new Error("Select at least one Meta platform.");

  const primaryConfig = requireMetaPublisherConfig(primaryPlatform);
  const requiredScopes = new Set<string>(["pages_show_list", "pages_read_engagement"]);
  if (platforms.includes("facebook")) requiredScopes.add("pages_manage_posts");
  if (platforms.includes("instagram")) {
    requiredScopes.add("instagram_basic");
    requiredScopes.add("instagram_content_publish");
  }

  const debugUrl = new URL(
    `https://graph.facebook.com/${primaryConfig.graphApiVersion}/debug_token`
  );
  debugUrl.searchParams.set("input_token", primaryConfig.accessToken);
  debugUrl.searchParams.set(
    "access_token",
    `${primaryConfig.appId}|${primaryConfig.appSecret}`
  );
  const tokenDebug = await getJson(debugUrl.toString());

  if (!tokenDebug.data?.is_valid) {
    throw new Error("The Meta Page access token is invalid or expired.");
  }
  if (tokenDebug.data.app_id && tokenDebug.data.app_id !== primaryConfig.appId) {
    throw new Error("The Meta token belongs to a different application.");
  }

  const grantedScopes = new Set(tokenDebug.data.scopes || []);
  const missingScopes = [...requiredScopes].filter(
    (permission) => !grantedScopes.has(permission)
  );
  if (missingScopes.length) {
    throw new Error(`Missing Meta permissions: ${missingScopes.join(", ")}`);
  }

  const result: {
    facebook?: { id: string; name: string; linkedInstagramId: string | null };
    instagram?: { id: string; username: string };
    token: {
      valid: true;
      scopes: string[];
      expiresAt: number | null;
      dataAccessExpiresAt: number | null;
    };
  } = {
    token: {
      valid: true,
      scopes: [...requiredScopes],
      expiresAt: tokenDebug.data.expires_at || null,
      dataAccessExpiresAt: tokenDebug.data.data_access_expires_at || null,
    },
  };

  if (platforms.includes("facebook")) {
    const config = requireMetaPublisherConfig("facebook");
    const baseUrl = `https://graph.facebook.com/${config.graphApiVersion}`;
    const page = await getJson(
      `${baseUrl}/${encodeURIComponent(
        config.pageId
      )}?fields=id,name,instagram_business_account{id,username}&access_token=${encodeURIComponent(
        config.accessToken
      )}&appsecret_proof=${encodeURIComponent(
        appSecretProof(config.accessToken, config.appSecret)
      )}`
    );

    if (!page.id || page.id !== config.pageId) {
      throw new Error("Meta returned a different Facebook Page identity.");
    }

    result.facebook = {
      id: page.id,
      name: page.name || "Facebook Page",
      linkedInstagramId: page.instagram_business_account?.id || null,
    };
  }

  if (platforms.includes("instagram")) {
    const config = requireMetaPublisherConfig("instagram");
    const baseUrl = `https://graph.facebook.com/${config.graphApiVersion}`;
    const account = await getJson(
      `${baseUrl}/${encodeURIComponent(
        config.instagramUserId
      )}?fields=id,username&access_token=${encodeURIComponent(
        config.accessToken
      )}&appsecret_proof=${encodeURIComponent(
        appSecretProof(config.accessToken, config.appSecret)
      )}`
    );

    if (!account.id || account.id !== config.instagramUserId) {
      throw new Error("Meta returned a different Instagram account identity.");
    }

    const linkedInstagramId = result.facebook?.linkedInstagramId;
    if (linkedInstagramId && linkedInstagramId !== account.id) {
      throw new Error("The configured Instagram account is not linked to this Facebook Page.");
    }

    result.instagram = {
      id: account.id,
      username: account.username || "Instagram professional account",
    };
  }

  return result;
}
