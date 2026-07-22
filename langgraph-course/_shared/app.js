(() => {
  const lesson = window.LANGGRAPH_LESSON;
  const sceneRoot = document.querySelector("#scene");
  const composition = document.querySelector("#composition");
  const timeline = document.querySelector("#timeline");
  const playButton = document.querySelector("#play");
  const sceneStrip = document.querySelector("#scene-strip");
  const currentTimeEl = document.querySelector("#time-current");
  const totalTimeEl = document.querySelector("#time-total");
  const currentSceneEl = document.querySelector("#scene-index");
  const sceneNameEl = document.querySelector("#scene-name");
  const speakerTitleEl = document.querySelector("#speaker-scene-title");
  const speakerTextEl = document.querySelector("#speaker-text");
  const paragraphRefEl = document.querySelector("#paragraph-ref");
  const speedButton = document.querySelector("#speed");
  const scenes = lesson.scenes;
  const speedOptions = [1, 1.25, 1.5, 0.75];
  let currentIndex = 0;
  let currentElapsed = 0;
  let playing = false;
  let speedIndex = 0;
  let lastFrame = performance.now();

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const formatTime = (seconds) => { const rounded = Math.max(0, Math.floor(seconds)); return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`; };
  const totalDuration = scenes.reduce((sum, scene) => sum + scene.estimatedDuration, 0);
  const sceneStart = (index) => scenes.slice(0, index).reduce((sum, scene) => sum + scene.estimatedDuration, 0);

  function renderStepRail(items) {
    return `<div class="step-rail">${items.map((item, index) => `<div class="step-block"><b>${String(index + 1).padStart(2, "0")}</b><span>${escapeHtml(item)}</span></div>`).join("")}</div>`;
  }

  function renderVisual(scene) {
    const visual = scene.visual;
    if (scene.type === "opening") return `<div class="question-visual"><p class="big-question">${escapeHtml(visual.question)}</p><div class="answer-rail">${visual.answers.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></div>`;
    if (scene.type === "contract") return `<div><h3 class="visual-heading">学习结果不是记忆，而是可执行判断</h3>${renderStepRail(visual.steps)}</div>`;
    if (scene.type === "placement") return `<div class="matrix-visual"><div class="matrix-head"><span>字段</span><span>放置位置</span><span>为什么</span><span>硬边界</span></div>${visual.rows.map((row) => `<div class="matrix-row">${row.map((cell) => `<span>${escapeHtml(cell)}</span>`).join("")}</div>`).join("")}</div>`;
    if (scene.type === "lifecycle") return `<div class="lane-visual">${visual.lanes.map((lane) => `<div class="lane">${lane.map((cell) => `<span>${escapeHtml(cell)}</span>`).join("")}</div>`).join("")}</div>`;
    if (scene.type === "case") return `<div class="flow-visual">${visual.steps.map((item, index) => `${index > 0 ? '<span class="flow-arrow">→</span>' : ''}<span class="flow-node">${escapeHtml(item)}</span>`).join("")}<p class="flow-owner">${escapeHtml(visual.owner)}</p></div>`;
    if (scene.type === "ownership") return `<div><div class="question-grid">${visual.questions.map((item) => `<div class="question-item">${escapeHtml(item)}</div>`).join("")}</div><div class="example-callout">反例：${escapeHtml(visual.example)}</div></div>`;
    if (scene.type === "decision") return `<div class="decision-visual">${visual.columns.map((column) => `<section class="decision-column"><h3>${escapeHtml(column[0])}</h3><p>${escapeHtml(column[1])}</p><p>${escapeHtml(column[2])}</p></section>`).join("")}</div>`;
    if (scene.type === "evidence") return `<div class="evidence-visual">${visual.columns.map((item, index) => `<div class="evidence-step"><span>${String(index + 1).padStart(2, "0")}<br />${escapeHtml(item)}</span></div>${index < visual.columns.length - 1 ? '<span class="flow-arrow">→</span>' : ''}`).join("")}<p class="evidence-rule">${escapeHtml(visual.rule)}</p></div>`;
    if (scene.type === "failure") return `<div class="failure-visual"><div class="good-bad"><section class="good"><h3>允许进入 State</h3><p>${visual.good.map(escapeHtml).join("<br />")}</p></section><section class="bad"><h3>禁止进入 checkpoint</h3><p>${visual.bad.map(escapeHtml).join("<br />")}</p></section></div><div class="stop-line">终态：${escapeHtml(visual.stop)}</div></div>`;
    if (scene.type === "truth") return `<div class="truth-visual"><div class="truth-sides"><section class="truth-side"><h3>${escapeHtml(visual.message[0])}</h3><p>${escapeHtml(visual.message[1])}<br />${escapeHtml(visual.message[2])}</p></section><section class="truth-side truth"><h3>${escapeHtml(visual.truth[0])}</h3><p>${escapeHtml(visual.truth[1])}<br />${escapeHtml(visual.truth[2])}</p></section></div><div class="truth-result">${escapeHtml(visual.result)}</div></div>`;
    if (scene.type === "replay") return `<div class="replay-visual"><div class="run-line">${visual.runs.map((item, index) => `${index > 0 ? '<span class="run-arrow">→</span>' : ''}<span>${escapeHtml(item)}</span>`).join("")}</div><div class="replay-key">识别依据：${escapeHtml(visual.key)}</div><div class="state-strip">${visual.states.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></div>`;
    if (scene.type === "workbench") return `<div class="workbench-visual"><div class="workbench-fields">${visual.fields.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div><div class="workbench-output">产物：${escapeHtml(visual.output)}</div></div>`;
    return `<div class="closing-visual">${visual.checks.map((item) => `<div class="closing-check">${escapeHtml(item)}</div>`).join("")}<div class="closing-next">${escapeHtml(visual.next)}</div></div>`;
  }

  function renderScene(index, seekToStart = true) {
    currentIndex = Math.max(0, Math.min(index, scenes.length - 1));
    const scene = scenes[currentIndex];
    if (seekToStart) currentElapsed = 0;
    sceneRoot.classList.remove("scene-enter");
    void sceneRoot.offsetWidth;
    sceneRoot.classList.add("scene-enter");
    sceneRoot.dataset.sceneId = scene.id;
    sceneRoot.dataset.start = String(sceneStart(currentIndex));
    sceneRoot.dataset.duration = String(scene.estimatedDuration);
    sceneRoot.innerHTML = `<div class="scene-top"><span class="scene-type">${escapeHtml(scene.kicker)}</span><span>${escapeHtml(scene.id)} · ${String(scene.index).padStart(2, "0")} / ${scenes.length}</span></div><div class="scene-layout"><div class="scene-copy"><p class="scene-kicker">${escapeHtml(scene.kicker)}</p><h1 class="scene-title">${escapeHtml(scene.title)}</h1><p class="scene-claim">${escapeHtml(scene.claim)}</p><div class="scene-number">本场景对应讲稿第 ${scene.start}–${scene.end} 段</div></div><div class="visual">${renderVisual(scene)}</div></div>`;
    currentSceneEl.textContent = String(scene.index).padStart(2, "0");
    sceneNameEl.textContent = scene.title;
    speakerTitleEl.textContent = scene.title;
    speakerTextEl.textContent = scene.paragraphs.join("\n\n");
    paragraphRefEl.textContent = `讲稿段落 ${scene.start}–${scene.end} · 估算 ${formatTime(scene.estimatedDuration)}`;
    document.querySelectorAll(".scene-chip").forEach((chip, chipIndex) => chip.classList.toggle("active", chipIndex === currentIndex));
    if (seekToStart) updateProgress();
  }

  function updateProgress() {
    const absoluteTime = sceneStart(currentIndex) + currentElapsed;
    timeline.value = String((absoluteTime / totalDuration) * 100);
    currentTimeEl.textContent = formatTime(absoluteTime);
    totalTimeEl.textContent = formatTime(totalDuration);
  }

  function setPlaying(next) { playing = next; playButton.textContent = playing ? "Ⅱ" : "▶"; playButton.setAttribute("aria-label", playing ? "暂停" : "播放"); }
  function advanceFrame(now) {
    const delta = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    if (playing) {
      currentElapsed += delta * speedOptions[speedIndex];
      if (currentElapsed >= scenes[currentIndex].estimatedDuration) {
        if (currentIndex === scenes.length - 1) { currentElapsed = scenes[currentIndex].estimatedDuration; setPlaying(false); }
        else { renderScene(currentIndex + 1); }
      }
      updateProgress();
    }
    requestAnimationFrame(advanceFrame);
  }

  function buildSceneStrip() {
    sceneStrip.innerHTML = scenes.map((scene, index) => `<button class="scene-chip" type="button" data-index="${index}"><small>${String(scene.index).padStart(2, "0")} · ${escapeHtml(scene.kicker)}</small><strong>${escapeHtml(scene.title)}</strong></button>`).join("");
    sceneStrip.querySelectorAll(".scene-chip").forEach((chip) => chip.addEventListener("click", () => { setPlaying(false); renderScene(Number(chip.dataset.index)); }));
  }

  playButton.addEventListener("click", () => setPlaying(!playing));
  document.querySelector("#previous").addEventListener("click", () => { setPlaying(false); renderScene(currentIndex - 1); });
  document.querySelector("#next").addEventListener("click", () => { setPlaying(false); renderScene(currentIndex + 1); });
  speedButton.addEventListener("click", () => { speedIndex = (speedIndex + 1) % speedOptions.length; speedButton.textContent = `${speedOptions[speedIndex]}×`; });
  timeline.addEventListener("input", () => { const target = (Number(timeline.value) / 100) * totalDuration; let accumulator = 0; const index = scenes.findIndex((scene) => { const next = accumulator + scene.estimatedDuration; const inScene = target >= accumulator && target <= next; accumulator = next; return inScene; }); const safeIndex = index < 0 ? scenes.length - 1 : index; renderScene(safeIndex, false); currentElapsed = Math.max(0, target - sceneStart(safeIndex)); updateProgress(); });
  document.querySelector("#fullscreen").addEventListener("click", () => { if (composition.requestFullscreen) composition.requestFullscreen(); });
  document.addEventListener("keydown", (event) => { if (event.target instanceof HTMLInputElement) return; if (event.key === " ") { event.preventDefault(); setPlaying(!playing); } if (event.key === "ArrowRight") renderScene(currentIndex + 1); if (event.key === "ArrowLeft") renderScene(currentIndex - 1); });

  document.querySelector("#scene-total").textContent = String(scenes.length).padStart(2, "0");
  buildSceneStrip();
  renderScene(0);
  requestAnimationFrame(advanceFrame);
})();
