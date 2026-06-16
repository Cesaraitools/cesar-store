import {
  AutomationProduct,
  AutomationProductSearchResult,
  searchAutomationProducts,
} from "@/lib/server/automation-products";

type AgentAction = "answer" | "clarify" | "handoff";
type AgentConfidence = "high" | "medium" | "low";

type AgentReply = {
  action: AgentAction;
  confidence: AgentConfidence;
  reply: string;
  productIds: string[];
  category: string | null;
  needsHuman: boolean;
};

type AgentMeta = {
  used: boolean;
  model: string | null;
  action?: AgentAction;
  confidence?: AgentConfidence;
  productIds?: string[];
  reason?: string;
  generatedAt: string;
};

export type AutomationAgentResult = AutomationProductSearchResult & {
  meta: AutomationProductSearchResult["meta"] & {
    ai: AgentMeta;
  };
};

type AgentInput = {
  query: string;
  handoffQuery?: string | null;
  requestedLanguage?: string | null;
  limit?: number;
  baseUrl: string;
  skipAi?: boolean;
};

type OpenAIResponse = {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: unknown;
    }>;
  }>;
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_MAX_OUTPUT_TOKENS = 450;

function isAiEnabled() {
  if (!process.env.OPENAI_API_KEY) return false;

  return !/^(0|false|no|off)$/i.test(process.env.AUTOMATION_AI_ENABLED || "");
}

function getAiModel() {
  return (process.env.OPENAI_MODEL || DEFAULT_MODEL).trim();
}

function getAiMaxOutputTokens() {
  const configured = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS);
  if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_MAX_OUTPUT_TOKENS;

  return Math.min(Math.max(Math.floor(configured), 120), 900);
}

function limitText(value: string, maxLength: number) {
  const text = value.trim();
  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function compactProduct(product: AutomationProduct) {
  return {
    id: product.id,
    name: product.name,
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    description: limitText(product.description || "", 260),
    price: product.price,
    currency: product.currency,
    category: product.category,
    productUrl: product.productUrl,
    isAvailable: product.isAvailable,
    stockStatus: product.stockStatus,
    variantSummary: product.variantSummary,
  };
}

function extractResponseText(data: OpenAIResponse) {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  const content = data.output
    ?.flatMap((item) => item.content || [])
    .find((item) => item.type === "output_text" && typeof item.text === "string");

  return typeof content?.text === "string" ? content.text : "";
}

function parseAgentReply(text: string): AgentReply | null {
  try {
    const parsed = JSON.parse(text) as Partial<AgentReply>;
    const action = parsed.action;
    const confidence = parsed.confidence;
    const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";

    if (!action || !["answer", "clarify", "handoff"].includes(action)) return null;
    if (!confidence || !["high", "medium", "low"].includes(confidence)) return null;
    if (!reply) return null;

    return {
      action,
      confidence,
      reply: limitText(reply, 1400),
      productIds: Array.isArray(parsed.productIds)
        ? parsed.productIds.filter((item): item is string => typeof item === "string")
        : [],
      category: typeof parsed.category === "string" ? parsed.category : null,
      needsHuman: Boolean(parsed.needsHuman),
    };
  } catch {
    return null;
  }
}

function buildFallbackMeta(reason: string): AgentMeta {
  return {
    used: false,
    model: null,
    reason,
    generatedAt: new Date().toISOString(),
  };
}

function shouldUseAi(result: AutomationProductSearchResult) {
  if (!result.products.length && result.meta.autoReply === "answer") {
    return {
      ok: false,
      reason: "no_candidate_products",
    };
  }

  if (!result.products.length && result.meta.intent !== "clarify") {
    return {
      ok: false,
      reason: "no_candidate_products",
    };
  }

  return {
    ok: true,
    reason: null,
  };
}

function validateAgentReply(result: AutomationProductSearchResult, agentReply: AgentReply) {
  if (agentReply.action === "answer" && !result.products.length) {
    return "ai_answer_without_products";
  }

  if (agentReply.action === "answer" && agentReply.needsHuman) {
    return "ai_conflicting_handoff_signal";
  }

  return null;
}

function applyAgentDecision(
  result: AutomationProductSearchResult,
  agentReply: AgentReply
): AutomationProductSearchResult {
  const needsHuman = agentReply.needsHuman || agentReply.action === "handoff";
  const autoReply = needsHuman
    ? "handoff"
    : agentReply.action === "clarify"
    ? "clarify"
    : "answer";

  return {
    ...result,
    meta: {
      ...result.meta,
      confidence: agentReply.confidence,
      intent: autoReply === "answer" ? result.meta.intent : "clarify",
      autoReply,
      handoffReason: needsHuman
        ? result.meta.handoffReason || "ai_requested_handoff"
        : result.meta.handoffReason,
    },
  };
}

function withAgentMeta(
  result: AutomationProductSearchResult,
  ai: AgentMeta,
  suggestedReply = result.suggestedReply
): AutomationAgentResult {
  return {
    ...result,
    suggestedReply,
    meta: {
      ...result.meta,
      ai,
    },
  };
}

async function generateAiReply(result: AutomationProductSearchResult) {
  const apiKey = process.env.OPENAI_API_KEY || "";
  const model = getAiModel();
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content:
            "You are Cesar Store's Arabic commerce assistant. Use the local catalog search as product context, not as a final judge. Answer from the provided store products and links when they fit the customer's intent. Do not invent products, prices, stock, scents, colors, sizes, links, or policies. If candidateProducts is empty or does not match the request, ask one useful clarification question or direct the customer to send details in Messenger. For order, payment, refund, return, phone, or private-account issues, do not expose details publicly; write a short safe reply asking the customer to message the page. Keep Arabic replies friendly, direct, and concise.",
        },
        {
          role: "user",
          content: JSON.stringify({
            customerMessage: result.query,
            language: result.language,
            searchMeta: {
              intent: result.meta.intent,
              bestScore: result.meta.bestScore,
              confidence: result.meta.confidence,
              matchedCategory: result.meta.matchedCategory,
              autoReply: result.meta.autoReply,
              handoffReason: result.meta.handoffReason,
            },
            candidateProducts: result.products.map(compactProduct),
            deterministicReply: result.suggestedReply,
            outputRules: [
              "Return valid JSON only.",
              "Use productUrl values only from candidateProducts.",
              "Treat searchMeta scores and autoReply as hints, not blockers.",
              "If candidateProducts is empty, do not answer with a product, price, stock, variant, or link.",
              "If the request needs private customer-service handling, choose action clarify unless no public reply is safe.",
              "For broad category questions, include 2-3 useful examples if available.",
              "For unavailable products, offer alternatives from candidateProducts.",
              "Never mention internal scoring, tokens, webhooks, or automation settings.",
            ],
          }),
        },
      ],
      max_output_tokens: getAiMaxOutputTokens(),
      store: false,
      temperature: 0.2,
      text: {
        format: {
          type: "json_schema",
          name: "cesar_store_automation_reply",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["action", "confidence", "reply", "productIds", "category", "needsHuman"],
            properties: {
              action: {
                type: "string",
                enum: ["answer", "clarify", "handoff"],
              },
              confidence: {
                type: "string",
                enum: ["high", "medium", "low"],
              },
              reply: {
                type: "string",
              },
              productIds: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              category: {
                type: ["string", "null"],
              },
              needsHuman: {
                type: "boolean",
              },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const data = (await response.json()) as OpenAIResponse;
  const agentReply = parseAgentReply(extractResponseText(data));

  if (!agentReply) {
    throw new Error("OpenAI returned an invalid automation reply");
  }

  return {
    model,
    agentReply,
  };
}

export async function answerAutomationQuestion(input: AgentInput): Promise<AutomationAgentResult> {
  const result = await searchAutomationProducts(input);

  if (!isAiEnabled()) {
    return withAgentMeta(result, buildFallbackMeta("ai_disabled_or_missing_key"));
  }

  if (input.skipAi) {
    return withAgentMeta(result, buildFallbackMeta("ai_skipped_by_request"));
  }

  const aiGate = shouldUseAi(result);
  if (!aiGate.ok) {
    return withAgentMeta(result, buildFallbackMeta(aiGate.reason || "ai_skipped"));
  }

  try {
    const { model, agentReply } = await generateAiReply(result);
    const validationReason = validateAgentReply(result, agentReply);

    if (validationReason) {
      return withAgentMeta(result, buildFallbackMeta(validationReason));
    }

    return withAgentMeta(
      applyAgentDecision(result, agentReply),
      {
        used: true,
        model,
        action: agentReply.action,
        confidence: agentReply.confidence,
        productIds: agentReply.productIds,
        generatedAt: new Date().toISOString(),
      },
      agentReply.reply
    );
  } catch (error) {
    console.warn("AUTOMATION AI FALLBACK:", error);

    return withAgentMeta(result, buildFallbackMeta("ai_generation_failed"));
  }
}
