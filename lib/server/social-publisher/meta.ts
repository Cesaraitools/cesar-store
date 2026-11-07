import { createHmac } from "crypto";
import { requireMetaPublisherConfig } from "./config";
import type { SocialPlatform } from "./types";

type MetaSuccess = {
  externalPostId: string;
  externalPostUrl: string;
};

type MetaErrorResponse = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
};

type MetaResponse = MetaErrorResponse & {
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
};

type MetaPageAccountsResponse = MetaErrorResponse & {
  data?: Array<{
    id?: string;
    name?: string;
    access_token?: string;
    tasks?: string[];
  }>;
};

export class MetaPublishOutcomeUnknownError extends Error {
  readonly outcomeUnknown = true;

  constructor(message: string) {
    super(message);
    this.name = "MetaPublishOutcomeUnknownError";
  }
}

export function isMetaPublishOutcomeUnknownError(error: unknown) {
  return (
    error instanceof MetaPublishOutcomeUnknownError ||
    Boolean(
      error &&
        typeof error === "object" &&
        "outcomeUnknown" in error &&
        (error as { outcomeUnknown?: unknown }).outcomeUnknown === true
    )
  );
}

function metaError(payload: MetaErrorResponse, fallback: string) {
  const message = payload.error?.message || fallback;
  const code = payload.error?.code ? ` (${payload.error.code})` : "";
  return new Error(`${message}${code}`);
}
function appSecretProof(accessToken: string, appSecret: string) {
  return createHmac("sha256", appSecret).update(accessToken).digest("hex");
}

async function postForm(
  url: string,
  values: Record<string, string>,
  options?: { publishingRequest?: boolean }
) {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(values),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    if (options?.publishingRequest) {
      const message = error instanceof Error ? error.message : "transport failure";
      throw new MetaPublishOutcomeUnknownError(
        `Meta publishing request outcome is unknown (${message}). Verify the social account before retrying.`
      );
    }
    throw error;
  }

  let payload: MetaResponse;
  try {
    payload = (await response.json()) as MetaResponse;
  } catch (error) {
    if (options?.publishingRequest) {
      throw new MetaPublishOutcomeUnknownError(
        "Meta publishing response could not be confirmed. Verify the social account before retrying."
      );
    }
    throw error;
  }

  if (!response.ok || payload.error) {
    throw metaError(payload, `Meta request failed with ${response.status}`);
  }

  return payload;
}

async function getJson<T extends MetaErrorResponse = MetaResponse>(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const payload = (await response.json()) as T;

  if (!response.ok || payload.error) {
    throw metaError(payload, `Meta request failed with ${response.status}`);
  }

  return payload;
}

async function resolveFacebookPageAccessToken(
  config: ReturnType<typeof requireMetaPublisherConfig>
) {
  const baseUrl = `${config.apiOrigin}/${config.graphApiVersion}`;
  const accountsUrl = new URL(`${baseUrl}/me/accounts`);
  accountsUrl.searchParams.set("fields", "id,name,access_token,tasks");
  accountsUrl.searchParams.set("access_token", config.accessToken);
  accountsUrl.searchParams.set(
    "appsecret_proof",
    appSecretProof(config.accessToken, config.appSecret)
  );

  const accounts = await getJson<MetaPageAccountsResponse>(
    accountsUrl.toString()
  );
  const page = accounts.data?.find((item) => item.id === config.pageId);

  if (!page) {
    throw new Error(
      "The Facebook system user cannot access the configured Page. Assign the Page to the system user and include business_management when generating its token."
    );
  }
  if (!page.tasks?.includes("CREATE_CONTENT")) {
    throw new Error(
      "The Facebook system user is missing the CREATE_CONTENT task for the configured Page."
    );
  }
  if (!page.access_token) {
    throw new Error("Meta did not return a Page access token for Facebook publishing.");
  }

  return page.access_token;
}

type TokenInspection = {
  valid: true;
  scopes: string[];
  expiresAt: number | null;
  dataAccessExpiresAt: number | null;
};

async function inspectAccessToken(input: {
  accessToken: string;
  appId: string;
  appSecret: string;
  graphApiVersion: string;
  requiredScopes: Set<string>;
  label: string;
}): Promise<TokenInspection> {
  const debugUrl = new URL(
    `https://graph.facebook.com/${input.graphApiVersion}/debug_token`
  );
  debugUrl.searchParams.set("input_token", input.accessToken);
  debugUrl.searchParams.set(
    "access_token",
    `${input.appId}|${input.appSecret}`
  );
  const tokenDebug = await getJson(debugUrl.toString());

  if (!tokenDebug.data?.is_valid) {
    throw new Error(`The ${input.label} access token is invalid or expired.`);
  }
  if (tokenDebug.data.app_id && tokenDebug.data.app_id !== input.appId) {
    throw new Error(`The ${input.label} token belongs to a different application.`);
  }

  const grantedScopes = new Set(tokenDebug.data.scopes || []);
  const missingScopes = [...input.requiredScopes].filter(
    (permission) => !grantedScopes.has(permission)
  );
  if (missingScopes.length) {
    throw new Error(
      `Missing ${input.label} permissions: ${missingScopes.join(", ")}`
    );
  }

  return {
    valid: true,
    scopes: [...grantedScopes],
    expiresAt: tokenDebug.data.expires_at || null,
    dataAccessExpiresAt: tokenDebug.data.data_access_expires_at || null,
  };
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
  imageUrls: string[],
  caption: string
): Promise<MetaSuccess> {
  const config = requireMetaPublisherConfig("facebook");
  const baseUrl = `${config.apiOrigin}/${config.graphApiVersion}`;
  const pageAccessToken = await resolveFacebookPageAccessToken(config);
  if (imageUrls.length > 1) {
    const photoIds: string[] = [];
    for (const imageUrl of imageUrls) {
      const photo = await postForm(
        `${baseUrl}/${encodeURIComponent(config.pageId)}/photos`,
        {
          url: imageUrl,
          published: "false",
          access_token: pageAccessToken,
          appsecret_proof: appSecretProof(pageAccessToken, config.appSecret),
        }
      );
      if (!photo.id) {
        throw new Error("Meta did not return an id for an unpublished Facebook photo.");
      }
      photoIds.push(photo.id);
    }

    const post = await postForm(
      `${baseUrl}/${encodeURIComponent(config.pageId)}/feed`,
      {
        message: caption,
        attached_media: JSON.stringify(
          photoIds.map((mediaFbid) => ({ media_fbid: mediaFbid }))
        ),
        access_token: pageAccessToken,
        appsecret_proof: appSecretProof(pageAccessToken, config.appSecret),
      },
      { publishingRequest: true }
    );
    const externalPostId = post.id || post.post_id || "";
    if (!externalPostId) {
      throw new MetaPublishOutcomeUnknownError(
        "Meta accepted the Facebook album request without a post id. Verify the Page before retrying."
      );
    }

    return {
      externalPostId,
      externalPostUrl: `https://www.facebook.com/${externalPostId}`,
    };
  }

  const payload = await postForm(
    `${baseUrl}/${encodeURIComponent(config.pageId)}/photos`,
    {
      url: imageUrls[0],
      message: caption,
      published: "true",
      access_token: pageAccessToken,
      appsecret_proof: appSecretProof(pageAccessToken, config.appSecret),
    },
    { publishingRequest: true }
  );
  const externalPostId = payload.post_id || payload.id || "";

  if (!externalPostId) {
    throw new MetaPublishOutcomeUnknownError(
      "Meta accepted the Facebook publishing request without a post id. Verify the Page before retrying."
    );
  }

  return {
    externalPostId,
    externalPostUrl: `https://www.facebook.com/${externalPostId}`,
  };
}

async function publishInstagram(
  imageUrls: string[],
  caption: string
): Promise<MetaSuccess> {
  const config = requireMetaPublisherConfig("instagram");
  const baseUrl = `${config.apiOrigin}/${config.graphApiVersion}`;
  if (imageUrls.length > 1) {
    const childIds: string[] = [];
    for (const imageUrl of imageUrls) {
      const child = await postForm(
        `${baseUrl}/${encodeURIComponent(config.instagramUserId)}/media`,
        {
          image_url: imageUrl,
          is_carousel_item: "true",
          access_token: config.accessToken,
          appsecret_proof: appSecretProof(config.accessToken, config.appSecret),
        }
      );
      if (!child.id) {
        throw new Error("Meta did not return an Instagram carousel child id.");
      }
      await waitForInstagramContainer(
        baseUrl,
        child.id,
        config.accessToken,
        config.appSecret
      );
      childIds.push(child.id);
    }

    const carousel = await postForm(
      `${baseUrl}/${encodeURIComponent(config.instagramUserId)}/media`,
      {
        media_type: "CAROUSEL",
        children: childIds.join(","),
        caption,
        access_token: config.accessToken,
        appsecret_proof: appSecretProof(config.accessToken, config.appSecret),
      }
    );
    if (!carousel.id) {
      throw new Error("Meta did not return an Instagram carousel container id.");
    }
    await waitForInstagramContainer(
      baseUrl,
      carousel.id,
      config.accessToken,
      config.appSecret
    );

    const published = await postForm(
      `${baseUrl}/${encodeURIComponent(config.instagramUserId)}/media_publish`,
      {
        creation_id: carousel.id,
        access_token: config.accessToken,
        appsecret_proof: appSecretProof(config.accessToken, config.appSecret),
      },
      { publishingRequest: true }
    );
    if (!published.id) {
      throw new MetaPublishOutcomeUnknownError(
        "Meta accepted the Instagram carousel without a media id. Verify the account before retrying."
      );
    }

    let permalink = "https://www.instagram.com/";
    try {
      const media = await getJson(
        `${baseUrl}/${encodeURIComponent(published.id)}?fields=permalink&access_token=${encodeURIComponent(
          config.accessToken
        )}&appsecret_proof=${encodeURIComponent(
          appSecretProof(config.accessToken, config.appSecret)
        )}`
      );
      permalink = media.permalink || permalink;
    } catch (error) {
      console.error("SOCIAL PUBLISHER INSTAGRAM PERMALINK ERROR:", error);
    }

    return { externalPostId: published.id, externalPostUrl: permalink };
  }

  const container = await postForm(
    `${baseUrl}/${encodeURIComponent(config.instagramUserId)}/media`,
    {
      image_url: imageUrls[0],
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
    },
    { publishingRequest: true }
  );

  if (!published.id) {
    throw new MetaPublishOutcomeUnknownError(
      "Meta accepted the Instagram publishing request without a media id. Verify the account before retrying."
    );
  }

  let permalink = "https://www.instagram.com/";
  try {
    const media = await getJson(
      `${baseUrl}/${encodeURIComponent(published.id)}?fields=permalink&access_token=${encodeURIComponent(
        config.accessToken
      )}&appsecret_proof=${encodeURIComponent(
        appSecretProof(config.accessToken, config.appSecret)
      )}`
    );
    permalink = media.permalink || permalink;
  } catch (error) {
    // Publishing already returned a media ID. A permalink lookup failure must
    // not turn a confirmed publication into an automatic duplicate retry.
    console.error("SOCIAL PUBLISHER INSTAGRAM PERMALINK ERROR:", error);
  }

  return {
    externalPostId: published.id,
    externalPostUrl: permalink,
  };
}

export async function publishToMeta(input: {
  platform: SocialPlatform;
  imageUrls?: string[];
  imageUrl?: string;
  caption: string;
}) {
  const imageUrls = Array.from(
    new Set([...(input.imageUrls || []), input.imageUrl || ""].map(String).filter(Boolean))
  );
  if (!imageUrls.length || imageUrls.length > 10) {
    throw new Error("Meta posts require between 1 and 10 public images.");
  }

  if (input.platform === "facebook") {
    return publishFacebook(imageUrls, input.caption);
  }

  return publishInstagram(imageUrls, input.caption);
}

export async function testMetaPublisherConnection(
  platforms: SocialPlatform[]
) {
  const primaryPlatform = platforms[0];
  if (!primaryPlatform) throw new Error("Select at least one Meta platform.");

  const facebookConfig = platforms.includes("facebook")
    ? requireMetaPublisherConfig("facebook")
    : null;
  const instagramConfig = platforms.includes("instagram")
    ? requireMetaPublisherConfig("instagram")
    : null;
  const facebookSystemUserToken = facebookConfig
    ? await inspectAccessToken({
        ...facebookConfig,
        requiredScopes: new Set([
          "pages_show_list",
          "pages_read_engagement",
          "pages_manage_posts",
        ]),
        label: "Facebook system user",
      })
    : null;
  const facebookPageAccessToken = facebookConfig
    ? await resolveFacebookPageAccessToken(facebookConfig)
    : null;
  const facebookToken = facebookConfig && facebookPageAccessToken
    ? await inspectAccessToken({
        ...facebookConfig,
        accessToken: facebookPageAccessToken,
        requiredScopes: new Set([
          "pages_show_list",
          "pages_read_engagement",
          "pages_manage_posts",
        ]),
        label: "Facebook Page",
      })
    : null;
  const instagramRequiredScopes = new Set(
    instagramConfig?.instagramAuthMode === "unified_login"
      ? ["instagram_basic", "instagram_content_publish"]
      : instagramConfig?.instagramAuthMode === "instagram_login"
        ? ["instagram_business_basic", "instagram_business_content_publish"]
        : [
          "pages_show_list",
          "pages_read_engagement",
          "instagram_basic",
          "instagram_content_publish",
        ]
  );
  const instagramToken = instagramConfig
    ? await inspectAccessToken({
        ...instagramConfig,
        requiredScopes: instagramRequiredScopes,
        label: "Instagram",
      })
    : null;
  const primaryToken =
    primaryPlatform === "facebook" ? facebookToken : instagramToken;

  if (!primaryToken || (facebookConfig && !facebookSystemUserToken)) {
    throw new Error("Meta token validation did not return a result.");
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
    tokens: {
      facebook?: TokenInspection;
      instagram?: TokenInspection;
    };
    instagramAuthMode:
      | "unified_login"
      | "instagram_login"
      | "facebook_login"
      | null;
  } = {
    token: primaryToken,
    tokens: {
      ...(facebookToken ? { facebook: facebookToken } : {}),
      ...(instagramToken ? { instagram: instagramToken } : {}),
    },
    instagramAuthMode: instagramConfig?.instagramAuthMode || null,
  };

  if (platforms.includes("facebook")) {
    const config = facebookConfig!;
    const pageAccessToken = facebookPageAccessToken!;
    const baseUrl = `${config.apiOrigin}/${config.graphApiVersion}`;
    const page = await getJson(
      `${baseUrl}/${encodeURIComponent(
        config.pageId
      )}?fields=id,name,instagram_business_account{id,username}&access_token=${encodeURIComponent(
        pageAccessToken
      )}&appsecret_proof=${encodeURIComponent(
        appSecretProof(pageAccessToken, config.appSecret)
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
    const config = instagramConfig!;
    const baseUrl = `${config.apiOrigin}/${config.graphApiVersion}`;
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
