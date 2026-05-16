import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// 统一 AI 调用层。
// 关键约束：平台不存储 API Key —— Key 由调用方（API 路由）从请求头透传进来，
// 用完即弃，不落库、不记录日志。

export type AIProvider = "deepseek" | "openai" | "qwen" | "claude";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  provider: AIProvider;
  apiKey: string;
  system: string;
  messages: ChatMessage[];
  model?: string;
}

// OpenAI 兼容协议的服务商配置（DeepSeek / 通义千问均兼容 OpenAI 接口）
const OPENAI_COMPATIBLE: Record<
  Exclude<AIProvider, "claude">,
  { baseURL?: string; defaultModel: string }
> = {
  openai: { baseURL: undefined, defaultModel: "gpt-4o-mini" },
  deepseek: {
    baseURL: "https://api.deepseek.com",
    defaultModel: "deepseek-chat",
  },
  qwen: {
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-plus",
  },
};

const DEFAULT_CLAUDE_MODEL = "claude-3-5-sonnet-latest";

export function isValidProvider(v: string): v is AIProvider {
  return ["deepseek", "openai", "qwen", "claude"].includes(v);
}

// 流式聊天补全：返回文本增量的异步迭代器。
export async function* streamChat(
  req: ChatRequest
): AsyncGenerator<string, void, unknown> {
  if (req.provider === "claude") {
    const client = new Anthropic({ apiKey: req.apiKey });
    const stream = client.messages.stream({
      model: req.model || DEFAULT_CLAUDE_MODEL,
      max_tokens: 8192,
      system: req.system,
      messages: req.messages,
    });
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
    return;
  }

  const cfg = OPENAI_COMPATIBLE[req.provider];
  const client = new OpenAI({ apiKey: req.apiKey, baseURL: cfg.baseURL });
  const stream = await client.chat.completions.create({
    model: req.model || cfg.defaultModel,
    stream: true,
    messages: [{ role: "system", content: req.system }, ...req.messages],
  });
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
