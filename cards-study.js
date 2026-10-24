(() => {
  const labels={new_relationship:"Новое знакомство",existing_relationship:"Существующие отношения",separation_or_ex:"Расставание или бывший партнёр",work_and_study:"Работа и учёба",family:"Семья",self_development:"Личное развитие",choice:"Выбор"};
  const esc=value=>String(value||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const cards=()=>window.MANARA_DATA||[];
  const paragraph=(label,value)=>value?`<section><h3>${esc(label)}</h3><p>${esc(value)}</p></section>`:"";
  const list=(label,values)=>Array.isArray(values)&&values.length?`<section><h3>${esc(label)}</h3><ul>${values.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section>`:"";
  function openCard(id){
    const card=cards().find(item=>item.id===id);if(!card)return;
    const d=card.relationship_dynamic||{};
    const contexts=Object.entries(card.contexts||{}).map(([key,value])=>paragraph(labels[key]||key,value)).join("");
    document.getElementById("card-detail").innerHTML=`<p class="eyebrow">${esc(card.groupName||card.suit||"Колода Манара")}</p><h2>${esc(card.name)}</h2>${list("Ключевые слова",card.keywords)}${paragraph("Основная тема",card.core_theme)}${paragraph("Наблюдение за изображением",card.image_observation)}<section><h3>Динамика отношений</h3>${paragraph("Моя сторона",d.self)}${paragraph("Возможная сторона другого человека",d.other)}${paragraph("Что происходит между участниками",d.between)}<p class="note">Это символические гипотезы, а не установленное знание о другом человеке.</p></section>${paragraph("Чувства и переживание",card.feelings)}${paragraph("Мысли",card.thoughts)}${paragraph("Возможные намерения",card.intentions)}${paragraph("Наблюдаемое поведение",card.behavior)}${list("Ресурсное проявление",card.light_expression)}${list("Теневая сторона",card.shadow_expression)}${contexts}${paragraph("Совет",card.advice)}${paragraph("Риск трактовки",card.risk)}${list("Образные маркеры",card.visual_tags)}<p class="note">Учебный порядок: сюжет изображения → ядро карты → вопрос и позиция расклада → контекст → соседние карты. Намерения по карте остаются гипотезой; проверяйте их реальными словами и поступками.</p>`;
    document.getElementById("card-dialog").showModal();
  }
  const observer=new MutationObserver(()=>document.querySelectorAll("#card-list .catalog-card:not([data-study-ready])").forEach(article=>{const text=article.querySelector("p")?.textContent||"",id=text.split("·").pop()?.trim();if(!id||!cards().some(card=>card.id===id))return;article.dataset.studyReady="true";const button=document.createElement("button");button.className="secondary card-open";button.textContent="Открыть полное учебное значение";button.addEventListener("click",()=>openCard(id));article.append(button)}));
  observer.observe(document.getElementById("card-list"),{childList:true,subtree:true});
  document.getElementById("close-card").addEventListener("click",()=>document.getElementById("card-dialog").close());
  document.getElementById("card-dialog").addEventListener("click",event=>{if(event.target.id==="card-dialog")event.target.close()});
})();
