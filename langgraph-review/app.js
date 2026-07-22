(() => {
  const data = window.LANGGRAPH_REVIEW_DATA;
  const storageKey = "langgraph-review-state-v1";
  const app = document.querySelector("#app");
  const allLessons = data.modules.flatMap((module) => module.lessons);
  const reviewState = JSON.parse(localStorage.getItem(storageKey) || "{}");
  let selectedModule = "all";
  let selectedLessonId = location.hash.slice(1) || allLessons[0]?.id;
  let searchTerm = "";
  let toastTimer;

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const lessonState = (id) => reviewState[id] || { status: "pending", checks: {}, notes: "" };
  const save = () => localStorage.setItem(storageKey, JSON.stringify(reviewState));
  const showToast = (message) => { clearTimeout(toastTimer); const node = document.querySelector(".toast"); if (node) node.textContent = message; toastTimer = setTimeout(() => node?.remove(), 1800); };
  const moduleForLesson = (id) => data.modules.find((module) => module.lessons.some((lesson) => lesson.id === id));
  const currentLesson = () => allLessons.find((lesson) => lesson.id === selectedLessonId) || allLessons[0];

  function filteredLessons() {
    const term = searchTerm.trim().toLowerCase();
    return allLessons.filter((lesson) => {
      const inModule = selectedModule === "all" || lesson.moduleId === selectedModule;
      const haystack = [lesson.id, lesson.title, lesson.goal, lesson.paragraphs.join(" ")].join(" ").toLowerCase();
      return inModule && (!term || haystack.includes(term));
    });
  }

  function reviewedCount() { return allLessons.filter((lesson) => lessonState(lesson.id).status === "approved").length; }
  function changesCount() { return allLessons.filter((lesson) => lessonState(lesson.id).status === "changes").length; }

  function render() {
    const lesson = currentLesson();
    if (!lesson) { app.innerHTML = '<div class="empty"><h2>暂无课程内容</h2><p>没有找到可审阅的单元。</p></div>'; return; }
    const module = moduleForLesson(lesson.id);
    const currentIndex = allLessons.findIndex((item) => item.id === lesson.id);
    const previous = allLessons[currentIndex - 1];
    const next = allLessons[currentIndex + 1];
    const state = lessonState(lesson.id);
    const visibleLessons = filteredLessons();
    const checklist = [
      "教学目标能被讲稿完整支撑",
      "定义、边界、对比和企业案例齐全",
      "正常路径与失败路径都可讲清",
      "练习能产出工程或运营可用证据",
      "设计结论与实验事实边界清楚"
    ];

    app.innerHTML = '<header class="topbar">'
      + '<div class="brand"><div class="brand-mark">LG</div><div class="brand-copy"><p class="brand-title">LangGraph 课程审阅台</p><p class="brand-subtitle">最终讲稿基础 · 不直接进入视频制作</p></div></div>'
      + '<div class="topbar-actions"><input class="search" id="search" placeholder="搜索单元、概念或讲稿内容" value="' + escapeHtml(searchTerm) + '" /><button class="top-button" id="export">导出审阅结果</button></div>'
      + '</header><div class="layout">'
      + '<aside class="sidebar"><div class="sidebar-heading"><h2>重点模块</h2><span class="count">' + data.modules.length + ' 个</span></div><div class="module-list">'
      + '<button class="module-button ' + (selectedModule === "all" ? "active" : "") + '" data-module="all"><span class="module-code">ALL</span><span class="module-name">全部重点单元</span><span class="module-meta">' + data.lessonCount + ' 个单元</span></button>'
      + data.modules.map((item) => '<button class="module-button ' + (selectedModule === item.id ? "active" : "") + '" data-module="' + item.id + '"><span class="module-code">ARCH-' + item.code + '</span><span class="module-name">' + escapeHtml(item.title) + '</span><span class="module-meta">' + item.lessons.length + ' 个单元 · ' + item.lessons.filter((lessonItem) => lessonState(lessonItem.id).status === "approved").length + ' 已通过</span></button>').join("")
      + '</div></aside>'
      + '<main class="main"><div class="main-inner">'
      + '<div class="hero"><div><p class="eyebrow">ARCH-' + escapeHtml(module.code) + ' / ' + escapeHtml(lesson.id) + '</p><h1>' + escapeHtml(lesson.title) + '</h1><p>' + escapeHtml(module.title) + '。这是给开发同事审核的讲稿基础页，内容来自最终讲稿与单元教学设计，不代表实验已经执行。</p></div><span class="status-badge">DESIGN-ONLY</span></div>'
      + '<div class="lesson-nav">' + (previous ? '<button id="previous">← ' + escapeHtml(previous.id) + ' ' + escapeHtml(previous.title) + '</button>' : '<span></span>') + (next ? '<button id="next">' + escapeHtml(next.id) + ' ' + escapeHtml(next.title) + ' →</button>' : '<span></span>') + '</div>'
      + '<section class="section"><div class="section-heading"><h2>本节要解决什么</h2><span class="section-kicker">教学合同</span></div><p class="goal">' + escapeHtml(lesson.goal) + '</p>' + (lesson.mustDo.length ? '<ul class="bullet-list">' + lesson.mustDo.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") + '</ul>' : '') + '</section>'
      + '<section class="section"><div class="section-heading"><h2>最终讲稿</h2><span class="section-kicker">' + lesson.paragraphCount + ' 段 · ' + lesson.cjkChars + ' 中文字符</span></div><div class="narration">' + lesson.paragraphs.map((paragraph) => '<p>' + escapeHtml(paragraph) + '</p>').join("") + '</div></section>'
      + '<section class="section"><div class="section-heading"><h2>教学设计依据</h2><span class="section-kicker">用于判断讲稿是否讲到位</span></div><div class="two-col"><div class="subsection"><h3>练习与产物</h3><p>' + escapeHtml(lesson.exercise || "待补充") + '</p>' + (lesson.artifacts.length ? '<ul class="bullet-list">' + lesson.artifacts.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") + '</ul>' : '') + '</div><div class="subsection"><h3>本课边界</h3><p>' + escapeHtml(lesson.boundary || "待补充") + '</p><h3 style="margin-top:16px">实验边界</h3><p>' + escapeHtml(lesson.experiment || "当前仍需真实执行验证") + '</p></div></div><details><summary>展开练习步骤、通过标准和画面输入</summary><div class="two-col" style="margin-top:16px"><div class="subsection"><h3>练习步骤</h3><ul class="bullet-list">' + (lesson.exerciseSteps.length ? lesson.exerciseSteps.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") : '<li>待补充</li>') + '</ul></div><div class="subsection"><h3>通过标准</h3><ul class="bullet-list">' + (lesson.acceptance.length ? lesson.acceptance.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") : '<li>待补充</li>') + '</ul></div></div><div class="subsection" style="margin-top:18px"><h3>后续画面需要承载</h3><ul class="bullet-list">' + (lesson.visualInputs.length ? lesson.visualInputs.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") : '<li>后续根据讲稿重新设计，不使用统一模板</li>') + '</ul></div></details></section>'
      + '<div class="lesson-nav">' + (previous ? '<button id="previous-bottom">← 上一个单元</button>' : '<span></span>') + (next ? '<button id="next-bottom">下一个单元 →</button>' : '<span></span>') + '</div>'
      + '</div></main>'
      + '<aside class="review-rail"><div class="review-sticky"><div class="review-heading"><h2>审阅面板</h2><span class="count">' + reviewedCount() + '/' + data.lessonCount + ' 通过</span></div><div class="review-grid"><div class="review-block" style="border-top:0;padding-top:0"><h3>本单元结论</h3><div class="review-state"><button class="state-button ' + (state.status === "pending" ? "active" : "") + '" data-state="pending">待审阅</button><button class="state-button ' + (state.status === "approved" ? "active" : "") + '" data-state="approved">通过</button><button class="state-button ' + (state.status === "changes" ? "active" : "") + '" data-state="changes">需修改</button></div><p class="small-note">当前单元：' + escapeHtml(lesson.id) + ' · 可用左右箭头切换。</p></div><div class="review-block"><h3>审核清单</h3>' + checklist.map((item, index) => '<label class="check-row"><input type="checkbox" data-check="' + index + '" ' + (state.checks[index] ? "checked" : "") + ' /><span>' + item + '</span></label>').join("") + '</div><div class="review-block"><h3>问题与修改建议</h3><textarea class="notes" id="notes" placeholder="记录需要开发同事复核的问题、缺少的例子或技术事实…">' + escapeHtml(state.notes) + '</textarea><p class="small-note">审核记录保存在当前浏览器，可导出 JSON 交给课程负责人汇总。</p></div></div><div class="review-block"><h3>源文件定位</h3><p class="small-note">最终讲稿：' + escapeHtml(lesson.sourcePath) + '</p><p class="small-note">教学设计：' + escapeHtml(lesson.designPath) + '</p><p class="small-note">筛选结果：' + visibleLessons.length + ' 个单元 · 已标记需修改 ' + changesCount() + ' 个</p></div></div></aside>'
      + '</div>';

    document.querySelector("#search")?.addEventListener("input", (event) => { searchTerm = event.target.value; render(); document.querySelector("#search")?.focus(); });
    document.querySelectorAll("[data-module]").forEach((button) => button.addEventListener("click", () => { selectedModule = button.dataset.module; const firstInModule = selectedModule === "all" ? allLessons[0] : allLessons.find((item) => item.moduleId === selectedModule); if (firstInModule) { selectedLessonId = firstInModule.id; location.hash = selectedLessonId; } render(); }));
    document.querySelectorAll("[data-state]").forEach((button) => button.addEventListener("click", () => { reviewState[lesson.id] = { ...lessonState(lesson.id), status: button.dataset.state }; save(); render(); showToast("已保存本单元审阅结论"); }));
    document.querySelectorAll("[data-check]").forEach((input) => input.addEventListener("change", () => { const nextState = lessonState(lesson.id); nextState.checks[input.dataset.check] = input.checked; reviewState[lesson.id] = nextState; save(); showToast("审核清单已保存"); }));
    document.querySelector("#notes")?.addEventListener("input", (event) => { const nextState = lessonState(lesson.id); nextState.notes = event.target.value; reviewState[lesson.id] = nextState; save(); });
    ["#previous", "#previous-bottom"].forEach((selector) => document.querySelector(selector)?.addEventListener("click", () => navigate(previous)));
    ["#next", "#next-bottom"].forEach((selector) => document.querySelector(selector)?.addEventListener("click", () => navigate(next)));
    document.querySelector("#export")?.addEventListener("click", exportReview);
  }

  function navigate(lesson) { if (!lesson) return; selectedLessonId = lesson.id; location.hash = selectedLessonId; render(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function exportReview() { const payload = { exportedAt: new Date().toISOString(), course: data.title, reviewedCount: reviewedCount(), changesCount: changesCount(), lessons: allLessons.map((lesson) => ({ id: lesson.id, title: lesson.title, ...lessonState(lesson.id) })) }; const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "langgraph-course-review.json"; link.click(); URL.revokeObjectURL(link.href); showToast("审阅结果已导出"); }
  window.addEventListener("hashchange", () => { selectedLessonId = location.hash.slice(1) || allLessons[0]?.id; render(); });
  render();
})();
