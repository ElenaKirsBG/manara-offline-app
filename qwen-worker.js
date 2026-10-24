import { CreateMLCEngine, prebuiltAppConfig } from "@mlc-ai/web-llm";
const MODEL = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
let engine = null;
self.onmessage = async ({ data }) => {
  const { id, type } = data;
  try {
    if (type === "init") {
      if (engine) await engine.unload();
      engine = await CreateMLCEngine(MODEL, {
        appConfig: { ...prebuiltAppConfig, cacheBackend: "indexeddb" },
        initProgressCallback: (report) => self.postMessage({ id, type: "progress", text: report.text, progress: report.progress }),
      }, { context_window_size: 8192 });
      self.postMessage({ id, type: "done", ready: true });
      return;
    }
    if (type === "generate" && engine) {
      let content = "";
      const stream = await engine.chat.completions.create({ messages: data.messages, temperature: 0.45, max_tokens: 2048, stream: true });
      for await (const chunk of stream) {
        content += chunk.choices[0]?.delta?.content ?? "";
        self.postMessage({ id, type: "progress", text: `Qwen пишет разбор · ${content.length} знаков…` });
        if (chunk.choices[0]?.finish_reason === "length") throw new Error("Ответ не поместился в предел модели. Попробуйте расклад поменьше.");
      }
      if (!content.trim()) throw new Error("Модель не вернула текст.");
      self.postMessage({ id, type: "done", content: content.trim() });
      return;
    }
    throw new Error("Сначала запустите локальную модель Qwen.");
  } catch (error) {
    self.postMessage({ id, type: "error", message: error instanceof Error ? error.message : "Ошибка локальной модели." });
  }
};
