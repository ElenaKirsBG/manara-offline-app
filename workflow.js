(function(){
  const $ = id => document.getElementById(id);
  let activeReadingId = null;
  const originalRenderReading = renderReading;
  renderReading = function(record){
    originalRenderReading(record);
    const variants = Array.isArray(record.alternativeReadings) ? record.alternativeReadings : [];
    const saved = variants.map((variant, index) => '<article class="combination"><h4>Вариант ' + (index + 1) + ' · ' + esc(variant.mode === "offline" ? "офлайн" : "ChatGPT") + '</h4><p>' + esc(variant.text).replace(/\n/g, "<br>") + '</p></article>').join("");
    const block = document.createElement("section");
    block.className = "workflow-actions";
    block.innerHTML = saved + '<div class="workflow-buttons"><button class="primary" type="button" data-start-new-reading="' + esc(record.id) + '">Новый разбор</button><button class="secondary" type="button" data-alternative-reading="' + esc(record.id) + '">Другой вариант трактовки</button></div>';
    $("reading").append(block);
  };
  const originalRenderHistory = renderHistory;
  renderHistory = function(){
    originalRenderHistory();
    const history = readHistory();
    document.querySelectorAll(".history-item").forEach(item => {
      const open = item.querySelector("[data-open-reading]");
      if (!open) return;
      const record = history.find(entry => entry.id === open.dataset.openReading);
      if (record && Array.isArray(record.alternativeReadings) && record.alternativeReadings.length) {
        const saved = document.createElement("section");
        saved.className = "history-alternates";
        saved.innerHTML = record.alternativeReadings.map((variant, index) => '<article class="combination"><h4>Вариант ' + (index + 1) + ' · ' + esc(variant.mode === "offline" ? "офлайн" : "ChatGPT") + '</h4><p>' + esc(variant.text).replace(/\n/g, "<br>") + '</p></article>').join("");
        open.insertAdjacentElement("beforebegin", saved);
      }
      if (!item.querySelector("[data-alternative-reading]")) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary history-alternative";
        button.dataset.alternativeReading = open.dataset.openReading;
        button.textContent = "Другой вариант трактовки";
        open.insertAdjacentElement("afterend", button);
      }
    });
  };
  function ensureWorkflowUI(){
    if (!$("workflow-status")) {
      const client = $("client-name");
      if (client) {
        const status = document.createElement("p");
        status.id = "workflow-status";
        status.className = "note";
        status.setAttribute("aria-live", "polite");
        client.insertAdjacentElement("afterend", status);
      }
    }
    if (!$("variant-dialog")) document.body.insertAdjacentHTML("beforeend", '<dialog id="variant-dialog" class="chatgpt-dialog"><button class="dialog-close" type="button" data-close-variant aria-label="Закрыть">×</button><h2>Другой вариант трактовки</h2><p class="note">Выберите локальный разбор на устройстве или подготовьте запрос для ChatGPT. Онлайн-разбор не отправляется автоматически.</p><button id="make-offline-variant" class="primary" type="button">Офлайн-вариант</button><button id="make-online-variant" class="secondary" type="button">Подготовить вариант в ChatGPT</button></dialog>');
  }
  function readHistory(){ try { return JSON.parse(localStorage.getItem("manara-history") || "[]"); } catch { return []; } }
  function saveHistory(history){ localStorage.setItem("manara-history", JSON.stringify(history)); }
  function startNewReading(id){
    const history = readHistory();
    const record = history.find(item => item.id === id);
    if (!record) return;
    const clientName = ($("client-name").value || record.clientName || "").trim().replace(/\s+/g, " ");
    const status = $("workflow-status");
    if (!clientName) {
      status.textContent = "Укажите клиента или псевдоним, чтобы сохранить этот разбор в его истории.";
      $("client-name").focus();
      $("client-name").scrollIntoView({behavior:"smooth", block:"center"});
      return;
    }
    record.clientName = clientName;
    record.clientId = clientName.toLocaleLowerCase("ru");
    saveHistory(history);
    updateClientOptions();
    $("client-name").value = clientName;
    $("question").value = "";
    $("reading-notes").value = "";
    $("jumper-count").value = "0";
    updateCountLimit();
    document.querySelectorAll(".manual-card-select").forEach(x => x.value = "");
    renderManualCards();
    if ($("draw-mode").value === "animated") resetAnimationSession();
    $("reading").innerHTML = '<p class="note">Предыдущий разбор сохранён в истории клиента «' + esc(clientName) + '». Заполните вопрос для нового расклада.</p>';
    status.textContent = "";
    $("question").focus();
    window.scrollTo({top:0, behavior:"smooth"});
  }
  const financePositionGuides = {
    money_now:"Сверь образ карты с реальным положением: какие суммы, поступления и обязательства есть сейчас?",
    income:"Проверь, какой навык, ресурс, предложение или контакт можно превратить в оплачиваемую возможность и на каких условиях.",
    expense:"Посмотри на фактические траты и на время или силы, которые уходят без отдачи. Не считай это утечкой, пока не сверишь с цифрами.",
    money_risk:"Уточни стоимость, сроки, договорённости и возможные последствия до финансового решения.",
    money_step:"Выбери один небольшой измеримый шаг: назвать цену, отправить предложение, подать заявку, выставить счёт или записать движение денег."
  };
  const financeTagLens = {
    initiative:"самостоятельное действие для получения или увеличения дохода",
    resources:"имеющиеся навыки, средства, связи и доступная поддержка",
    stability:"регулярность поступлений, запас прочности и устойчивость бюджета",
    responsibility:"обязательства и распределение финансовой нагрузки",
    uncertainty:"неясность сумм, условий или ожидаемого результата",
    control:"управление деньгами и желание заранее гарантировать каждый результат",
    impulse:"решение или трата без достаточной проверки последствий",
    practicality:"конкретные цифры, сроки и повседневные действия",
    strategy:"планирование и последовательность шагов",
    overload:"объём обязательств и нагрузка на доступные ресурсы",
    avoidance:"отложенные денежные решения или разговоры об оплате",
    restriction:"реальное ограничение бюджета или условий, которое нужно назвать точно",
    support:"люди, инструменты и ресурсы, на которые можно опереться",
    growth:"обучение и постепенное расширение возможностей",
    choice:"несколько финансовых вариантов, которые стоит сравнить",
    hope:"ожидания, которые полезно сопоставить с расчётами",
    loss:"опасение потери, которое следует проверить по фактам",
    evaluation:"сравнение вариантов и оценка их реальной выгоды",
    communication:"разговор о цене, оплате, условиях и распределении средств",
    learning:"недостающие знания или навык, который можно развить",
    freedom:"пространство для выбора при соблюдении реальных обязательств",
    boundaries:"условия и пределы финансовых договорённостей",
    ambition:"цель по доходу, которую важно перевести в план",
    repetition:"повторяющийся способ обращаться с деньгами",
    delay:"отложенное действие или поступление, которое нужно проверить",
    waiting:"ожидание внешнего предложения вместо доступной инициативы",
    pleasure:"ценность и удовольствие, которые можно включить в план трат без самообмана",
    competition:"сравнение с рынком или другими предложениями",
    responsibility:"обязательства и распределение финансовой нагрузки"
  };
  function offlineAlternative(record){
    const financial = record.spreadId === "finances" || record.context === "money";
    if (financial) {
      const paragraphs = record.cards.map((item, index) => {
        const meaningsForCard = meanings[item.card.id] || {};
        const lenses = [...new Set((meaningsForCard.tags || []).map(tag => financeTagLens[tag]).filter(Boolean))].slice(0, 2);
        const angle = lenses.length ? "Вторая перспектива карты: " + lenses.join("; ") + "." : "Не переноси любовный или эмоциональный сюжет карты на деньги буквально: используй её образ как повод задать себе проверочный вопрос.";
        return (index + 1) + ". «" + item.position + "» — " + item.card.name + ". " + angle + " " + (financePositionGuides[item.positionId] || "Сверь эту позицию с реальными цифрами и договорённостями.");
      });
      return "Другой офлайн-взгляд — не прогноз, а проверка финансовой ситуации через наблюдаемые факты. " + paragraphs.join("\n\n") + "\n\nСобери вывод так: что уже известно по цифрам, где есть возможность, что пока только предполагается и какое действие даст новую информацию. Карты не определяют доход и не заменяют финансовый расчёт.";
    }
    const paragraphs = record.cards.map((item, index) => {
      const meaningsForCard = meanings[item.card.id] || {};
      const contextMeaning = meaningsForCard.contexts && meaningsForCard.contexts[record.context];
      const theme = contextMeaning || meaningsForCard.core_theme || "образ карты";
      const tags = meaningsForCard.tags || [];
      const role = /risk|danger|threat|obstacle|challenge|cost|expense/.test(item.positionId) ? "Проверь, что здесь подтверждено обстоятельствами, а что является опасением." : /step|advice|support|resource|strength|success_factor/.test(item.positionId) ? "Найди небольшой шаг, который зависит от тебя." : "Спроси себя, где эта тема проявляется в твоём опыте и что могло бы её опровергнуть.";
      const repeated = tags.length ? "Обрати внимание на темы: " + [...new Set(tags)].slice(0, 3).map(tag => tagLabels[tag] || tag).join(", ") + "." : "";
      return (index + 1) + ". «" + item.position + "» — " + item.card.name + ". В этом контексте карта предлагает рассмотреть: " + theme + " " + repeated + " " + role;
    });
    return "Другой офлайн-взгляд: прочитай расклад как набор гипотез, которые можно сопоставить с опытом, а не как утверждение о будущем.\n\n" + paragraphs.join("\n\n") + "\n\nИтоговая проверка: что подтверждается фактами, какая альтернативная версия ситуации тоже возможна и какой следующий шаг даст ясность?";
  }
  function openAlternative(id){ activeReadingId = id; $("variant-dialog").showModal(); }
  function addOfflineVariant(){
    const history = readHistory();
    const record = history.find(item => item.id === activeReadingId);
    if (!record) return;
    const variant = {id:String(Date.now()), mode:"offline", createdAt:new Date().toISOString(), text:offlineAlternative(record)};
    record.alternativeReadings = Array.isArray(record.alternativeReadings) ? record.alternativeReadings : [];
    record.alternativeReadings.push(variant);
    saveHistory(history);
    $("variant-dialog").close();
    if (!$("view-history").classList.contains("hidden")) renderHistory(); else renderReading(record);
  }
  function openOnlineAlternative(){
    const record = readHistory().find(item => item.id === activeReadingId);
    if (!record) return;
    const prompt = makePrompt(record).replace("Сделай подробный и понятный связный разбор расклада", "Сделай ДРУГОЙ самостоятельный вариант трактовки уже рассмотренного расклада. Не повторяй прежний текст. Прочитай те же карты с новой точки зрения, предложи альтернативную гипотезу, объясни ход рассуждения по каждой позиции и связкам, отдельно обозначь, что подтверждается фактами, а что остаётся предположением. Пиши простым связным языком и не добавляй сведений, которых нет в вопросе или картах. Не делай предсказаний как гарантий");
    $("chatgpt-prompt").value = prompt;
    $("variant-dialog").close();
    $("chatgpt-dialog").showModal();
  }
  document.addEventListener("click", event => {
    const start = event.target.closest("[data-start-new-reading]");
    if (start) { startNewReading(start.dataset.startNewReading); return; }
    const alternative = event.target.closest("[data-alternative-reading]");
    if (alternative) { openAlternative(alternative.dataset.alternativeReading); return; }
    if (event.target.id === "make-offline-variant") { addOfflineVariant(); return; }
    if (event.target.id === "make-online-variant") { openOnlineAlternative(); return; }
    if (event.target.closest("[data-close-variant]")) { $("variant-dialog").close(); }
  });
  document.addEventListener("DOMContentLoaded", ensureWorkflowUI);
  ensureWorkflowUI();
})();