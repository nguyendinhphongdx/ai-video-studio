// OpenAI Chat Completions; also used for Gemini and any OpenAI-compatible server (Ollama, LM Studio, OpenRouter...).
import OpenAI from "openai";
import { toJSONSchema } from "zod";

/** JSON schema for strict structured output: drop $schema and the safe-integer bounds zod adds to .int(). */
function strictSchema(schema) {
  const walk = (node) => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== "object") return node;
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === "$schema") continue;
      if ((k === "minimum" || k === "maximum") && Math.abs(v) >= Number.MAX_SAFE_INTEGER) continue;
      out[k] = walk(v);
    }
    return out;
  };
  return walk(toJSONSchema(schema));
}

/** Pull the JSON object out of a reply that may be wrapped in ``` fences or prose. */
function parseJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("AI không trả về JSON");
  return JSON.parse(text.slice(start, end + 1));
}

// Servers that don't support json_schema usually answer 400/422 and mention the parameter.
const rejectsJsonSchema = (e) => [400, 422].includes(e?.status) && /response_format|json_schema|schema/i.test(String(e?.message));

export function createOpenAI(llm) {
  const client = new OpenAI({
    apiKey: llm.apiKey || "not-needed",
    ...(llm.baseUrl ? { baseURL: llm.baseUrl } : {}),
  });

  const complete = async (messages, response_format) => {
    const r = await client.chat.completions.create({ model: llm.model, messages, ...(response_format ? { response_format } : {}) });
    const choice = r.choices[0];
    if (choice?.message?.refusal) throw new Error(`AI từ chối yêu cầu: ${choice.message.refusal}`);
    const text = choice?.message?.content;
    if (!text) throw new Error(`AI không trả về nội dung (finish_reason=${choice?.finish_reason})`);
    return text;
  };

  return {
    async generateSpec({ system, user, schema }) {
      const json = strictSchema(schema);
      const messages = [
        { role: "system", content: system },
        { role: "user", content: user },
      ];
      try {
        return parseJson(await complete(messages, { type: "json_schema", json_schema: { name: "video_spec", strict: true, schema: json } }));
      } catch (e) {
        if (!rejectsJsonSchema(e)) throw e;
      }
      // Fallback: plain JSON mode with the schema spelled out in the prompt.
      messages[1] = { role: "user", content: `${user}\n\nChỉ trả về MỘT object JSON đúng JSON Schema sau, không giải thích thêm:\n${JSON.stringify(json)}` };
      return parseJson(await complete(messages, { type: "json_object" }));
    },
    async ping() {
      const r = await client.chat.completions.create({ model: llm.model, messages: [{ role: "user", content: "Trả lời đúng một chữ: OK" }] });
      return r.model || llm.model;
    },
  };
}
