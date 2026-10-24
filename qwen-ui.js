let worker;
let serial = 0;
let busy = false;
let ready = false;
const pending = new Map();
function getWorker() {
  if (worker) return worker;
  worker = new Worker("./qwen-worker.bundle.js", { type: "module" });
  worker.addEventListener("message", ({ data }) => {
    const request = pending.get(data.id);
    if (!request) return;
    if (data.type === "progress") { request.onProgress?.(data); return; }
    pending.delete(data.id);
    if (data.type === "error") request.reject(new Error(data.message || "Ошибка Qwen."));
    else request.resolve(data);
  });
  worker.addEventListener("error", () => {
    for (const request of pending.values()) request.reject(new Error("Не удалось загрузить локальный модуль Qwen."));
    pending.clear(); worker = null; ready = false;
  });
  return worker;
}
function request(type, fields, onProgress) {
  return new Promise((resolve, reject) => {
    const id = ++serial;
    pending.set(id, { resolve, reject, onProgress });
    getWorker().postMessage({ id, type, ...fields });
  });
}
async function checkDevice() {
  if (!isSecureContext) throw new Error("Для локального Qwen откройте опубликованное приложение по HTTPS.");
  if (!navigator.gpu) throw new Error("WebGPU недоступен. На iPhone нужен Safari на iOS 26 или новее, обычная вкладка.");
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error("Браузер не предоставил доступ к GPU. Закройте тяжёлые вкладки и попробуйте снова.");
  if (!adapter.features.has("shader-f16")) throw new Error("Устройство не поддерживает необходимый GPU-формат shader-f16.");
}
function readHistory() { try { return JSON.parse(localStorage.getItem("manara-history") || "[]"); } catch { return []; } }
function saveHistory(history) { localStorage.setItem("manara-history", JSON.stringify(history)); }
document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-generate-qwen-reading]");
  if (!button || busy) return;
  const recordId = button.dataset.readingId;
  const status = document.getElementById(`qwen-status-${recordId}`);
  const panel = button.closest(".qwen-panel");
  const history = readHistory();
  const record = history.find((item) => item.id === recordId);
  if (!record || !window.makeQwenPrompt) { if (status) status.textContent = "Не удалось подготовить вопрос и карты для Qwen."; return; }
  busy = true; button.disabled = true;
  const progress = (info) => { if (status) status.textContent = info.text || (info.progress ? `Загрузка модели · ${Math.round(info.progress * 100)}%` : "Qwen загружает модель…"); };
  try {
    await checkDevice();
    if (!ready) {
      if (status) status.textContent = "Первая загрузка Qwen — около 1,1 ГБ. Оставьте приложение открытым и подключённым к Wi-Fi.";
      await request("init", {}, progress);
      ready = true;
    }
    if (status) status.textContent = "Qwen сопоставляет вопрос, позиции и значения карт. Держите приложение открытым.";
    const result = await request("generate", { messages: [
      { role: "system", content: "Ты — бережный и внимательный русскоязычный толкователь Таро Манара. Дай полный связный разбор, опирайся только на переданные вопрос, позиции и значения карт. Сначала изложи общий сюжет, затем разберись с каждой позицией и связями карт, покажи альтернативную гипотезу и заверши практическими выводами и вопросами для самоанализа. Отделяй наблюдаемое от предположений. Не заявляй, что знаешь мысли другого человека, не обещай будущее и не ставь диагнозы. Пиши естественно, человечно и без шаблонных повторов." },
      { role: "user", content: window.makeQwenPrompt(record) },
    ] }, progress);
    record.qwenReading = result.content;
    saveHistory(history);
    const output = panel?.querySelector(".qwen-result");
    if (output) { output.textContent = result.content; output.classList.remove("hidden"); }
    if (status) status.textContent = "Разбор готов и сохранён в истории на этом устройстве.";
    button.textContent = "Составить ещё один вариант Qwen";
  } catch (error) {
    if (status) status.textContent = `Не удалось запустить Qwen: ${error.message}`;
  } finally { busy = false; button.disabled = false; }
});
