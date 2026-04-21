import {
  icons,
  recommendedProteins,
  residueDescriptions
} from "./src/catalog.js";
import { fetchLiteratureEvidence } from "./src/literatureService.js";
import {
  DEFAULT_PROJECT_ID,
  createProject,
  deleteNote,
  getProteinKey as getStoredProteinKey,
  isSaved,
  loadNotes,
  loadProjects,
  loadRecentProteins,
  recordRecentProtein,
  saveNote
} from "./src/noteStore.js";
import { findProteinStructures } from "./src/proteinService.js";

const state = {
  query: "",
  results: [],
  isLoading: false,
  error: "",
  notice: "",
  selected: null,
  isComposing: false,
  searchToken: 0,
  debounceTimer: null,
  viewer: null,
  viewerStyle: "cartoon",
  literature: {},
  literatureErrors: {},
  literatureLoading: {},
  recommendations: [],
  theme: "light",
  isHelpOpen: false,
  notes: loadNotes(),
  projects: loadProjects(),
  currentProjectId: DEFAULT_PROJECT_ID,
  recentProteins: loadRecentProteins(),
  saveMessage: "",
  isReportOpen: false,
  isUpgradeOpen: false,
  reportSnapshot: "",
  variantQuery: "",
  showPredictionCompare: false,
  isSidebarOpen: false,
  isProjectFormOpen: false,
  newProjectName: "",
  isLearningOpen: false,
  language: window.localStorage.getItem("foldnote-language") || "ko"
};



async function searchRcsb(query, token) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    state.results = [];
    state.isLoading = false;
    state.error = "";
    state.notice = "";
    render();
    return;
  }

  state.isLoading = true;
  state.error = "";
  state.notice = "";
  render();

  try {
    const results = await findProteinStructures(trimmedQuery);
    if (token !== state.searchToken) return;
    state.results = results;
    state.isLoading = false;
    state.error = "";
    state.notice = results.length
      ? ""
      : "RCSB PDB와 AlphaFold DB에서 표시할 구조 후보를 찾지 못했습니다. UniProt accession 또는 더 정확한 영문 단백질명을 입력해 보세요.";
    render();
  } catch (error) {
    if (token !== state.searchToken) return;
    state.results = [];
    state.isLoading = false;
    state.error =
      "RCSB PDB API에 연결하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 검색해 주세요.";
    state.notice = "";
    render();
  }
}

function scheduleSearch(query) {
  window.clearTimeout(state.debounceTimer);
  state.query = query;

  if (!query.trim()) {
    state.searchToken += 1;
    state.results = [];
    state.isLoading = false;
    state.error = "";
    state.notice = "";
    render();
    return;
  }

  const token = state.searchToken + 1;
  state.searchToken = token;
  state.error = "";
  state.notice = "";
  state.debounceTimer = window.setTimeout(() => {
    searchRcsb(state.query, token);
  }, 650);
}

async function ensureLiterature(protein) {
  const key = getProteinKey(protein);
  if (state.literature[key] || state.literatureLoading[key]) return;

  state.literatureLoading[key] = true;
  state.literatureErrors[key] = "";

  try {
    const evidence = await fetchLiteratureEvidence(protein);
    state.literature[key] = evidence;
  } catch (error) {
    state.literatureErrors[key] =
      "논문 초록을 불러오지 못했습니다. 잠시 후 다시 시도하거나 영문 단백질명으로 검색해 주세요.";
  } finally {
    state.literatureLoading[key] = false;
    if (state.selected && getProteinKey(state.selected) === key) {
      render();
    }
  }
}

function getProteinKey(protein) {
  return getStoredProteinKey(protein);
}

function isSearchHome() {
  return !state.query.trim() && !state.results.length && !state.isLoading && !state.error && !state.notice;
}

function badge(protein) {
  const isPdb = protein.source === "PDB";
  return `<span class="badge ${isPdb ? "pdb" : "alpha"}">
    ${isPdb ? icons.database : icons.sparkle}
    ${protein.source}
  </span>`;
}

function render() {
  document.querySelector("#app").innerHTML = `
    <div class="app-shell ${state.theme === "dark" ? "dark" : ""}">
      ${renderTopbar()}
      <main class="main">
        ${state.isLearningOpen ? renderLearning() : state.selected ? renderViewer(state.selected) : renderSearch()}
      </main>
      <button class="help-float" type="button" data-help-open aria-label="도움말">?</button>
      ${state.isHelpOpen ? renderHelpModal() : ""}
      ${state.isUpgradeOpen ? renderUpgradeModal() : ""}
      ${state.isReportOpen && state.selected ? renderReportModal(state.selected) : ""}
    </div>
  `;

  bindEvents();
  if (state.selected) {
    initProteinViewer(state.selected);
    ensureLiterature(state.selected);
  }
}

function renderTopbar() {
  const isKo = state.language === "ko";
  return `
    <header class="topbar">
      ${state.selected ? "" : `
        <button class="icon-button menu-button" type="button" data-sidebar-toggle title="워크스페이스" aria-label="워크스페이스 열기">
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/></svg>
        </button>
      `}
      <button class="brand brand-button" type="button" data-home title="${t("home")}" aria-label="FoldNote ${t("home")}">
        <div class="brand-mark" aria-hidden="true">${icons.fold}</div>
        <div>
          <h1 class="brand-title">FoldNote <span>${isKo ? "폴드노트" : "Protein notes"}</span></h1>
          <p class="brand-subtitle">${t("brandSubtitle")}</p>
        </div>
      </button>
      <div class="topbar-actions">
        <button class="icon-button ${state.isLearningOpen ? "active" : ""}" type="button" data-learning-open title="생화학 학습" aria-label="생화학 학습">
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16"/><path d="M8 7h8"/><path d="M8 11h6"/></svg>
        </button>
        <div class="language-toggle" aria-label="${t("language")}">
          <button class="${state.language === "ko" ? "active" : ""}" type="button" data-language="ko">한국어</button>
          <button class="${state.language === "en" ? "active" : ""}" type="button" data-language="en">EN</button>
        </div>
        <button class="icon-button" type="button" data-theme-toggle title="테마 전환" aria-label="테마 전환">
          ${state.theme === "dark"
            ? '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'
            : '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6.8 6.8 0 0 0 8.7 8.7A8.5 8.5 0 1 1 12 3Z"/></svg>'}
        </button>
      </div>
    </header>
  `;
}

function renderSearch() {
  const showHomeContent =
    !state.query.trim() && !state.isLoading && !state.results.length && !state.error && !state.notice;

  return `
    <section class="search-screen">
      ${renderWorkspaceSidebar()}
      ${state.isSidebarOpen ? `<button class="sidebar-backdrop" type="button" data-sidebar-close aria-label="워크스페이스 닫기"></button>` : ""}
      <div class="search-main">
        <div class="search-wrap">
          <div class="hero">
            <div class="hero-icon" aria-hidden="true">${icons.search}</div>
            <h2>${t("heroTitle")}</h2>
            <p>${t("heroText")}</p>
          </div>

          <form class="search-form" data-search-form>
            <span class="search-symbol" aria-hidden="true">${icons.search}</span>
            <input
              class="search-input"
              data-search-input
              type="search"
              value="${escapeHtml(state.query)}"
              placeholder="${t("searchPlaceholder")}"
              autocomplete="off"
            />
          </form>

          ${showHomeContent ? renderRecentProteins() : ""}
          ${renderSearchState()}
          ${showHomeContent ? `${renderProModules()}${renderRecommendations()}${renderTips()}` : ""}
        </div>
      </div>
    </section>
  `;
}

function renderLearning() {
  const enzymeComponents = [
    {
      title: "활성 부위 (Active Site)",
      icon: "activity",
      tone: "blue",
      description: "기질이 결합하고 반응이 일어나는 3D 포켓입니다.",
      features: ["촉매 잔기: 화학 반응을 직접 수행", "결합 잔기: 기질을 인식하고 고정", "정확한 기하학: Å 단위 정밀도", "소수성/극성 배치: 기질 특이성"],
      examples: ["Ser-His-Asp 촉매 삼각", "Zn2+ 결합 부위", "옥시아니온 홀"]
    },
    {
      title: "리간드 결합",
      icon: "lock",
      tone: "violet",
      description: "기질, 생성물, 저해제가 결합하는 방식입니다.",
      features: ["Lock-and-Key: 정확한 형태 일치", "Induced Fit: 결합 시 구조 변화", "수소결합 네트워크", "소수성 상호작용"],
      examples: ["기질 특이성", "경쟁적 저해", "알로스테릭 조절"]
    },
    {
      title: "보조인자 (Cofactor)",
      icon: "sparkles",
      tone: "amber",
      description: "효소 활성에 필요한 비단백질 분자입니다.",
      features: ["금속 이온: Fe2+, Zn2+, Mg2+, Cu2+", "보조효소: NAD+, FAD, ATP", "헴 그룹: 산소 운반과 전자 전달", "조효소: 비타민 유도체"],
      examples: ["헴 그룹", "NAD+ 결합", "Mg2+-ATP 복합체"]
    },
    {
      title: "저해제 (Inhibitor)",
      icon: "circle",
      tone: "red",
      description: "효소 활성을 막는 분자들입니다.",
      features: ["경쟁적: 활성 부위에 결합", "비경쟁적: 다른 부위에 결합", "비가역적: 공유 결합 형성", "약물 설계: 질병 치료"],
      examples: ["페니실린", "스타틴", "프로테아제 저해제"]
    }
  ];
  const mechanisms = [
    ["세린 프로테아제", "Ser-His-Asp 촉매 삼각", "Ser이 친핵체로 작용하여 펩타이드 결합을 가수분해합니다.", "Trypsin, Chymotrypsin"],
    ["라이소자임", "이온 안정화", "Glu와 Asp가 글리코시드 결합 전이 상태를 안정화합니다.", "Lysozyme"],
    ["카르복시펩티다제", "금속 활성화", "Zn2+ 이온이 물 분자를 활성화하고 펩타이드를 절단합니다.", "Carboxypeptidase A"],
    ["RNase A", "산-염기 촉매", "His12와 His119가 RNA 인산 결합을 절단합니다.", "Ribonuclease A"]
  ];
  const concepts = [
    ["정밀한 배치", "촉매 잔기가 Å 단위로 정확하게 배치되어 전이 상태를 안정화합니다. 하나의 아미노산 변이도 활성을 크게 바꿀 수 있습니다."],
    ["유도 적합", "기질이 결합하면 효소가 구조를 바꿔 최적 반응 기하학을 만듭니다. 동적 구조 변화가 촉매에 필수적입니다."],
    ["금속 이온 역할", "금속 이온이 전자를 끌어당기거나 물을 활성화하여 반응을 가속합니다. 구조에서 배위 기하학을 관찰할 수 있습니다."],
    ["저해제 설계", "활성 부위 구조를 기반으로 약물을 설계합니다. 수소결합과 소수성 상호작용을 최적화하여 결합력을 높입니다."]
  ];

  return `
    <section class="learning-screen">
      <div class="enzyme-intro">
        <span>Biochemistry Classroom</span>
        <h2>효소와 결합</h2>
        <p><strong>활성 부위, 기질 결합, 보조인자, 저해제</strong>가 구조에서 어떤 모양으로 보이는지 학습합니다. 3D 구조가 촉매 메커니즘을 어떻게 결정하는지 이해합니다.</p>
      </div>

      <div class="enzyme-grid">
        ${enzymeComponents
          .map(
            (component) => `
              <article class="enzyme-card">
                <div class="enzyme-card-head ${component.tone}">
                  <div class="enzyme-icon ${component.icon}" aria-hidden="true">${renderLearningIcon(component.icon)}</div>
                  <h3>${escapeHtml(component.title)}</h3>
                </div>
                <div class="enzyme-card-body">
                  <p>${escapeHtml(component.description)}</p>
                  <div class="enzyme-feature-list">
                    ${component.features.map((feature) => `<div><span>•</span>${escapeHtml(feature)}</div>`).join("")}
                  </div>
                  <div class="enzyme-examples">
                    <p>예시:</p>
                    <div>${component.examples.map((example) => `<em>${escapeHtml(example)}</em>`).join("")}</div>
                  </div>
                </div>
              </article>
            `
          )
          .join("")}
      </div>

      <section class="mechanism-panel">
        <h3>${renderLearningIcon("activity")} 촉매 메커니즘 예시</h3>
        <div class="mechanism-grid">
          ${mechanisms
            .map(
              ([name, mechanism, description, example]) => `
                <article>
                  <h4>${escapeHtml(name)}</h4>
                  <strong>${escapeHtml(mechanism)}</strong>
                  <p>${escapeHtml(description)}</p>
                  <span>${escapeHtml(example)}</span>
                </article>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="concept-panel">
        <h3>구조-기능 관계</h3>
        <div class="concept-grid">
          ${concepts
            .map(
              ([title, description]) => `
                <article>
                  <h4>${escapeHtml(title)}</h4>
                  <p>${escapeHtml(description)}</p>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    </section>
  `;
}

function renderLearningIcon(name) {
  const icons = {
    activity: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 8-6-16-3 8H2"/></svg>',
    lock: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    sparkles: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9Z"/></svg>',
    circle: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/></svg>'
  };
  return icons[name] || icons.circle;
}

function renderWorkspaceSidebar() {
  const currentProject = state.projects.find((project) => project.id === state.currentProjectId) || state.projects[0];
  const notes = state.notes.filter((note) => (note.projectId || DEFAULT_PROJECT_ID) === currentProject.id);

  return `
    <aside class="workspace-sidebar ${state.isSidebarOpen ? "open" : ""}" aria-label="GitHub 워크스페이스">
      <div class="workspace-head">
        <div>
          <h2>GitHub 워크스페이스</h2>
          <p>GitHub Pages에서 구조 노트를 정리합니다.</p>
        </div>
        <button class="sidebar-close" type="button" data-sidebar-close aria-label="워크스페이스 닫기">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>
        </button>
      </div>
      <div class="workspace-section">
        <div class="workspace-section-head">
          <h3>폴더</h3>
          <button type="button" data-show-project-form aria-label="폴더 추가">+</button>
        </div>
        ${state.isProjectFormOpen
          ? `<form class="folder-create-form" data-create-project-form>
              <input type="text" data-project-name-input value="${escapeHtml(state.newProjectName)}" placeholder="새 폴더 이름" aria-label="새 폴더 이름" />
              <button type="submit" aria-label="폴더 추가">추가</button>
            </form>`
          : ""}
        <div class="workspace-folder-list">
          ${state.projects
            .map(
              (project) => `
                <button class="${project.id === state.currentProjectId ? "active" : ""}" type="button" data-project-id="${escapeHtml(project.id)}">
                  <strong>${escapeHtml(project.name)}</strong>
                  <span>${state.notes.filter((note) => (note.projectId || DEFAULT_PROJECT_ID) === project.id).length}개 노트</span>
                </button>
              `
            )
            .join("")}
        </div>
      </div>

      <div class="workspace-section">
        <div class="workspace-section-head">
          <h3>${escapeHtml(currentProject.name)}</h3>
          <span>${notes.length}개</span>
        </div>
        ${renderSavedNotes(notes)}
      </div>
    </aside>
  `;
}

function renderProModules() {
  return `
    <section class="pro-modules">
      <div class="pro-modules-head">
        <h3>상용화 모듈 미리보기</h3>
        <span>Static MVP</span>
      </div>
      <div class="pro-module-grid">
        <article>
          <strong>팀 워크스페이스</strong>
          <p>랩실/회사 단위 프로젝트 공유, 구조 주석, 참고문헌 묶음 관리로 확장 예정입니다.</p>
        </article>
        <article>
          <strong>API</strong>
          <p>단백질 ID를 넣으면 구조 요약과 근거 문장을 JSON으로 반환하는 B2B 기능입니다.</p>
        </article>
        <article>
          <strong>프라이빗 업로드</strong>
          <p>공개 전 PDB/mmCIF 파일을 분석하는 기능이며, 상용화 때 보안 저장 정책이 필요합니다.</p>
        </article>
      </div>
    </section>
  `;
}

function renderSavedNotes(notes) {
  if (!notes.length) return `<div class="workspace-empty">저장한 구조 노트가 여기에 표시됩니다.</div>`;

  return `
    <div class="saved-note-list">
      ${notes
        .map(
          (note) => {
            const chips = [
              note.stateLabel,
              note.literatureCount ? `논문 ${note.literatureCount}개` : "",
              note.resolution || note.method
            ].filter(Boolean);
            const nextActions = (note.nextActions || []).slice(0, 2);
            return `
            <article class="saved-note-card">
              <button type="button" data-open-note="${escapeHtml(note.id)}">
                <strong>${escapeHtml(note.name)}</strong>
                <span>${escapeHtml(note.structureId)} · ${escapeHtml(note.source)} · ${formatSavedDate(note.savedAt)}</span>
                ${chips.length ? `<div class="saved-note-chips">${chips.map((chip) => `<em>${escapeHtml(chip)}</em>`).join("")}</div>` : ""}
                <p>${escapeHtml(note.noteSummary || note.summary?.[0] || note.description || "저장된 구조 노트입니다.")}</p>
                ${nextActions.length
                  ? `<ul class="saved-note-actions">${nextActions.map((action) => `<li>${escapeHtml(action)}</li>`).join("")}</ul>`
                  : ""}
              </button>
              <button class="note-delete" type="button" data-delete-note="${escapeHtml(note.id)}" aria-label="노트 삭제">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>
              </button>
            </article>
          `;
          }
        )
        .join("")}
    </div>
  `;
}

function renderRecentProteins() {
  if (!state.recentProteins.length) return "";

  return `
    <section class="recent-strip">
      <div class="recent-strip-head">
        <h3>최근 본 단백질</h3>
        <span>최근 ${state.recentProteins.length}개</span>
      </div>
      <div class="recent-list">
        ${state.recentProteins
          .map(
            (protein) => `
              <button type="button" data-recent-query="${escapeHtml(protein.structureId || protein.englishName || protein.name)}">
                <strong>${escapeHtml(protein.name)}</strong>
                <span>${escapeHtml(protein.structureId)} · ${escapeHtml(protein.source)}</span>
              </button>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderSearchState() {
  if (state.isLoading) {
    return `
      <div class="status-card">
        <span class="spinner" aria-hidden="true"></span>
        <div>
          <strong>${t("loadingTitle")}</strong>
          <p>${t("loadingText")}</p>
        </div>
      </div>
    `;
  }

  return `
    ${state.error ? `<div class="status-card warning">${escapeHtml(state.error)}</div>` : ""}
    ${state.notice ? `<div class="status-card">${escapeHtml(state.notice)}</div>` : ""}
    ${state.results.length ? renderResults() : ""}
  `;
}

function renderResults() {
  return `
    <div class="results">
      ${state.results
        .map(
          (protein, index) => `
          <article class="result-card">
            <button class="result-main" type="button" data-result="${index}">
              <span class="result-id-corner">${renderResultId(protein)}</span>
              <div class="result-tag-row">
                <div class="state-tags result-tags">${renderStructureTags(protein)}</div>
              </div>
              <div class="result-title-row">
                <div class="result-title-left">
                  <h3 class="result-title">${renderProteinTitle(protein)}</h3>
                </div>
              </div>
              <div class="result-meta">
                ${protein.organism ? `<span>${t("organism")}: ${escapeHtml(protein.organism)}</span>` : ""}
                <span>${t("evidenceHint")}</span>
              </div>
              <div class="result-summary">
                <p>${escapeHtml(getResultComparisonText(protein))}</p>
              </div>
            </button>
          </article>
        `
        )
        .join("")}
    </div>
  `;
}

function renderResultId(protein) {
  const label = protein.pdbId ? "PDB ID" : "UniProt";
  const value = protein.pdbId || protein.accession || protein.alphaFoldId || "-";
  return `${label}: <span class="code-pill">${escapeHtml(value)}</span>`;
}

function createQuickSummary(protein) {
  if (state.language === "en") return createEnglishQuickSummary(protein);
  const feature = protein.features?.find(([, title]) => /기능|구조|관찰/.test(title))?.[2];
  const organismText = protein.organism ? `${protein.organism}에서 보고된 ` : "";
  return feature || `${protein.name}은 ${organismText}${protein.source} 구조로, 접힘과 결합 부위를 살펴볼 수 있습니다.`;
}

function localizedQuickSummary(protein) {
  if (state.language === "en") {
    return protein.quickSummaryEn || createEnglishQuickSummary(protein);
  }
  return protein.quickSummary || createQuickSummary(protein);
}

function createEnglishQuickSummary(protein) {
  const label = protein.stateLabelEn || stateLabelFallbackEn(protein.stateLabel) || "structure";
  const name = protein.englishName || protein.name || "This protein";
  const source = protein.source || "structure";
  const organism = protein.organism ? ` from ${protein.organism}` : "";
  return `${name} is a ${source} ${label.toLowerCase()}${organism}. Compare its fold, binding sites, and assembly against the related structures.`;
}

function localizedDescription(protein) {
  if (state.language === "en") {
    return `${protein.englishName || protein.name} is shown as a ${localizedStateLabel(protein).toLowerCase()} structure. Use it with the related state cards to compare what changed: ligand binding, resolution, repeat fragment, mutation, or chain assembly.`;
  }
  return protein.description || localizedQuickSummary(protein);
}

function renderProteinStory(protein) {
  const story = getProteinStory(protein);
  return `
    <section class="protein-story">
      ${story
        .map(
          (item) => `
            <article>
              <span>${escapeHtml(item.label)}</span>
              <p>${escapeHtml(item.text)}</p>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function getProteinStory(protein) {
  const features = protein.features || [];
  const functionText = findFeatureText(features, /기능|Function/i) || localizedQuickSummary(protein);
  const structureText = findFeatureText(features, /구조|Structure/i) || "입체 구조를 보면 접힘, 결합 부위, 사슬 배치를 한눈에 비교할 수 있습니다.";
  const inspectText =
    findFeatureText(features, /관찰|포인트|비교|What to inspect/i) ||
    stripTrailingStructureId(localizedStateReason(protein), protein) ||
    "다른 구조 후보와 비교하면서 리간드, 변이, 체인 접촉, 해상도 차이를 확인해 보세요.";

  if (state.language === "en") {
    return [
      { label: "What it is", text: functionText },
      { label: "Structure clue", text: structureText },
      { label: "Why inspect it", text: inspectText }
    ];
  }

  return [
    { label: "무엇인가", text: functionText },
    { label: "구조 힌트", text: structureText },
    { label: "왜 보는가", text: inspectText }
  ];
}

function findFeatureText(features, pattern) {
  const feature = features.find(([, title]) => pattern.test(title));
  return feature?.[2] || "";
}

function localizedFeatures(protein) {
  if (state.language !== "en") return protein.features || [];
  return [
    ["blue", "Function", "Connect the visible fold to the protein's biological role."],
    ["purple", "Structure", "Compare helices, strands, loops, chains, and repeated motifs."],
    ["green", "What to inspect", "Look for ligands, metal ions, chain interfaces, mutations, and local fragments."],
    ["amber", "Caution", "Each structure is one experimental or predicted state, not every possible state of the protein."]
  ];
}

function localizedConfidence(protein) {
  if (state.language === "en") {
    return protein.source === "AlphaFold"
      ? "This is a predicted model. Use the confidence coloring to separate reliable regions from flexible or uncertain regions."
      : "This is an experimental structure. Resolution, B-factors, missing residues, and bound molecules should be checked before interpreting fine details.";
  }
  return `${protein.confidence}입니다. AlphaFold 구조라면 잔기별 pLDDT 색상과 낮은 신뢰도 구간을 반드시 함께 보여주는 것이 좋습니다.`;
}

function renderHelpModal() {
  return `
    <div class="help-backdrop" data-help-close>
      <section class="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <button class="modal-close" type="button" data-help-close aria-label="닫기">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>
        </button>
        <h2 id="help-title">FoldNote 도움말</h2>
        <p>검색 결과를 선택한 뒤 오른쪽 패널의 전문 탭에서 구조 판독, 연관 키워드, 참고문헌과 근거 문장을 볼 수 있습니다.</p>

        <div class="help-grid">
          <div>
            <h3>사용 방법</h3>
            <ul>
              <li>단백질명, UniProt accession, PDB ID로 검색합니다.</li>
              <li>리본, 스틱, 구체, 표면, 신뢰도 보기로 구조를 바꿔 봅니다.</li>
              <li>구조 위 원자를 클릭하면 잔기 설명을 볼 수 있습니다.</li>
            </ul>
          </div>
          <div>
            <h3>데이터 출처</h3>
            <ul>
              <li>구조: RCSB PDB, AlphaFold DB</li>
              <li>논문 초록/참고문헌: Europe PMC</li>
              <li>3D 시각화: 3Dmol.js</li>
            </ul>
          </div>
        </div>

        <div class="license-note">
          <h3>상용화 전 체크</h3>
          <p>PDB 구조 데이터는 CC0로 제공되지만 원 구조 저자 표기를 권장합니다. AlphaFold DB는 상업적 사용이 가능한 CC BY 4.0 데이터라 출처와 라이선스 표기가 필요합니다. Europe PMC 논문 초록은 각 출판사/저자의 저작권이 유지되므로 원문 대량 복제 대신 짧은 요약, 링크, 인용 정보를 중심으로 제공하는 편이 안전합니다.</p>
          <p>의학적 판단이나 치료 조언이 아니라 연구/교육용 구조 탐색 도구로 표시하는 것이 좋습니다.</p>
        </div>

        <div class="source-links">
          <a href="https://www.rcsb.org/pages/usage-policy" target="_blank" rel="noreferrer">RCSB 정책</a>
          <a href="https://alphafold.com/" target="_blank" rel="noreferrer">AlphaFold 라이선스</a>
          <a href="https://europepmc.org/Copyright" target="_blank" rel="noreferrer">Europe PMC 저작권</a>
          <a href="https://github.com/3dmol/3Dmol.js" target="_blank" rel="noreferrer">3Dmol.js</a>
        </div>
      </section>
    </div>
  `;
}

function renderRecommendations() {
  const items = state.recommendations.length ? state.recommendations : getRandomRecommendations();
  state.recommendations = items;

  return `
    <section class="recommend-box">
      <div class="recommend-head">
        <div>
          <h3>${t("recommendTitle")}</h3>
          <p>${t("recommendText")}</p>
        </div>
      </div>
      <div class="recommend-grid">
        ${items
          .map(
            (item) => `
              <button class="recommend-card" type="button" data-recommend-query="${escapeHtml(item.query)}">
                <span>${escapeHtml(localizedRecommendation(item).tag)}</span>
                <strong>${escapeHtml(localizedRecommendation(item).name)}</strong>
                <p>${escapeHtml(localizedRecommendation(item).note)}</p>
              </button>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderTips() {
  return `
    <aside class="tip-box">
      <div aria-hidden="true">${icons.info}</div>
      <div>
        <h3>${t("tipsTitle")}</h3>
        <ul>
          <li>${t("tipName")}</li>
          <li>${t("tipPdb")}</li>
          <li>${t("tipEvidence")}</li>
        </ul>
      </div>
    </aside>
  `;
}

function getResultComparisonText(protein) {
  return stripTrailingStructureId(localizedStateReason(protein) || localizedQuickSummary(protein), protein);
}

function stripTrailingStructureId(text, protein) {
  const ids = [protein.pdbId, protein.accession, protein.alphaFoldId].filter(Boolean);
  return ids.reduce((current, id) => current.replace(new RegExp(`\\s*\\(${escapeRegExp(id)}\\)\\s*$`, "i"), ""), text || "");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRandomRecommendations() {
  return [...recommendedProteins]
    .sort(() => Math.random() - 0.5)
    .slice(0, 4);
}

const recommendationTranslations = {
  헤모글로빈: {
    name: "Hemoglobin",
    tag: "Starter",
    note: "A classic oxygen transport protein for learning structure and function."
  },
  인슐린: {
    name: "Insulin",
    tag: "Popular",
    note: "Useful for connecting hormone structure to blood glucose regulation."
  },
  p53: {
    name: "p53",
    tag: "Cancer research",
    note: "Known for DNA damage response and tumor suppressor function."
  },
  "스파이크 단백질": {
    name: "Spike protein",
    tag: "Virus",
    note: "Shows how viral surface proteins bind to host cells."
  },
  GFP: {
    name: "GFP",
    tag: "Fluorescence",
    note: "A widely used marker protein in life science experiments."
  },
  "CRISPR Cas9": {
    name: "CRISPR Cas9",
    tag: "Gene editing",
    note: "Inspect how Cas9 recognizes and cuts DNA."
  },
  콜라겐: {
    name: "Collagen",
    tag: "Structural protein",
    note: "A fibrous protein that supports skin and connective tissue strength."
  },
  라이소자임: {
    name: "Lysozyme",
    tag: "Enzyme",
    note: "A classic enzyme structure that breaks bacterial cell walls."
  }
};

function localizedRecommendation(item) {
  if (state.language !== "en") return item;
  return recommendationTranslations[item.name] || item;
}

function renderViewer(protein) {
  return `
    <section class="viewer-screen">
      <div class="viewer-pane">
        <div class="molecule-viewer" data-protein-viewer>
          <div class="viewer-loading">
            <span class="spinner" aria-hidden="true"></span>
            <strong>${escapeHtml(protein.pdbId || protein.name)} 구조를 불러오는 중입니다</strong>
          </div>
        </div>
        <div class="viewer-toolbar">
          <div class="viewer-title-card">
            <p>${protein.source} ${t("structureView")}</p>
            <h2>${renderProteinTitle(protein)}</h2>
          </div>
        </div>
        <div class="control-strip" aria-label="구조 보기 컨트롤">
          <button class="glass-button ${state.viewerStyle === "cartoon" ? "active" : ""}" type="button" data-view-style="cartoon" title="${t("cartoonView")}">${t("cartoon")}</button>
          <button class="glass-button ${state.viewerStyle === "stick" ? "active" : ""}" type="button" data-view-style="stick" title="${t("stickView")}">${t("stick")}</button>
          <button class="glass-button ${state.viewerStyle === "sphere" ? "active" : ""}" type="button" data-view-style="sphere" title="${t("sphereView")}">${t("sphere")}</button>
          <button class="glass-button ${state.viewerStyle === "surface" ? "active" : ""}" type="button" data-view-style="surface" title="${t("surfaceView")}">${t("surface")}</button>
          <button class="glass-button ${state.viewerStyle === "confidence" ? "active" : ""}" type="button" data-view-style="confidence" title="${t("confidenceView")}">${t("confidence")}</button>
        </div>
        ${renderColorLegend(protein)}
        <div class="atom-tooltip" data-atom-tooltip></div>
      </div>
      ${renderInfoPanel(protein)}
    </section>
  `;
}

function renderInfoPanel(protein) {
  return `
    <aside class="info-panel">
      <div class="info-inner">
        <div class="protein-heading">
          <h2>${escapeHtml(getDisplayName(protein))}</h2>
          ${badge(protein)}
        </div>
        <p class="brand-subtitle">${escapeHtml(getSecondaryName(protein))}</p>
        ${renderProteinStory(protein)}

        <div class="meta-grid">
          <div class="metric"><span>${protein.source === "PDB" ? "PDB ID" : "UniProt"}</span><strong>${protein.pdbId || protein.accession || "AlphaFold"}</strong></div>
          ${renderMetric(t("organism"), protein.organism)}
          ${renderMetric(t("method"), protein.method)}
          ${renderMetric(t("resolution"), protein.resolution)}
          ${renderMetric(t("size"), protein.size)}
          ${renderMetric(t("mass"), protein.mass)}
        </div>

        ${renderUnifiedInfo(protein)}
      </div>
    </aside>
  `;
}

function renderMetric(label, value) {
  if (!value || /정보\s*(없음|로딩 실패)|unknown/i.test(String(value))) return "";
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderUnifiedInfo(protein) {
  return `
    <section class="section">
      <h3>${t("description")}</h3>
      <p>${escapeHtml(localizedDescription(protein))}</p>
    </section>

    <section class="section">
      <h3>${t("keyFeatures")}</h3>
      <div class="feature-list">
        ${localizedFeatures(protein)
          .map(
            ([tone, title, text]) => `
              <div class="feature ${tone}">
                <strong>${escapeHtml(title)}:</strong> ${escapeHtml(text)}
              </div>
            `
          )
          .join("")}
      </div>
    </section>

    <section class="section">
      <h3>${t("confidence")}</h3>
      <p>${escapeHtml(localizedConfidence(protein))}</p>
    </section>

    ${renderComparisonPanel(protein)}

    <details class="detail-toggle">
      <summary>자세히 보기</summary>
      ${renderDetailedInfo(protein)}
      ${renderVariantPanel(protein)}
    </details>

    ${renderLiteraturePanel(protein)}
    ${renderResearchTools(protein)}
  `;
}

function renderLiteraturePanel(protein) {
  const key = getProteinKey(protein);
  const evidence = state.literature[key];
  const error = state.literatureErrors[key];
  const isLoading = state.literatureLoading[key];

  if (isLoading) {
    return `
      <section class="section pro-section">
        <h3>논문 근거</h3>
        <div class="evidence-status">
          <span class="spinner" aria-hidden="true"></span>
          <p>Europe PMC에서 관련 초록과 참고문헌을 찾고 있습니다.</p>
        </div>
      </section>
    `;
  }

  if (error) {
    return `
      <section class="section pro-section">
        <h3>논문 근거</h3>
        <div class="evidence-empty">${escapeHtml(error)}</div>
      </section>
    `;
  }

  if (!evidence) {
    return `
      <section class="section pro-section">
        <h3>논문 근거</h3>
        <div class="evidence-empty">논문 초록을 준비하고 있습니다.</div>
      </section>
    `;
  }

  const visibleArticles = evidence.articles.slice(0, 4);
  const hiddenArticles = evidence.articles.slice(4);

  return `
    <section class="section pro-section">
      <h3>연관 키워드</h3>
      <div class="entity-cloud">
        ${evidence.relatedEntities.length
          ? evidence.relatedEntities
              .map((entity) => `<span>${escapeHtml(entity.label)} <small>${entity.count}</small></span>`)
              .join("")
          : "<p>초록에서 반복적으로 등장하는 DNA/RNA/단백질 키워드를 찾지 못했습니다.</p>"}
      </div>
    </section>

    <section class="section pro-section">
      <h3>참고문헌</h3>
      <p class="section-lead">각 참고문헌 카드 안에 초록에서 뽑은 근거 문장을 함께 표시합니다.</p>
      <div class="reference-list">
        ${evidence.articles.length
          ? visibleArticles.map((article) => renderReference(article, evidence.claims || [])).join("")
          : "<p>표시할 참고문헌이 없습니다.</p>"}
        ${hiddenArticles.length
          ? `
            <details class="reference-more">
              <summary>더보기 ${hiddenArticles.length}개</summary>
              ${hiddenArticles.map((article) => renderReference(article, evidence.claims || [])).join("")}
            </details>
          `
          : ""}
      </div>
    </section>
  `;
}

function renderReference(article, claims = []) {
  const linkedClaims = claims.filter((claim) => claim.sourceUrl === article.url).slice(0, 2);
  return `
    <article class="reference-item">
      <a href="${escapeHtml(article.url)}" target="_blank" rel="noreferrer">${escapeHtml(article.title)}</a>
      <p>${escapeHtml(article.authors)}</p>
      <span>${escapeHtml(article.journal)} · ${escapeHtml(article.year)} · 인용 ${article.citedByCount}</span>
      ${linkedClaims.length
        ? `
          <div class="reference-evidence">
            <strong>근거 문장</strong>
            ${linkedClaims.map((claim) => `<p>${escapeHtml(claim.sentence)}</p>`).join("")}
          </div>
        `
        : ""}
    </article>
  `;
}

function renderReportModal(protein) {
  const key = getProteinKey(protein);
  const evidence = state.literature[key];
  const markdown = buildReportMarkdown(protein, evidence);

  return `
    <div class="report-backdrop" data-report-close>
      <section class="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <button class="modal-close" type="button" data-report-close aria-label="닫기">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>
        </button>
        <div class="report-head">
          <div>
            <h2 id="report-title">${escapeHtml(protein.name)} 리포트</h2>
            <p>구조, 기능, 논문 근거, 참고문헌을 한 번에 정리합니다.</p>
          </div>
          <span>자동 요약 · 확인 필요</span>
        </div>

        ${state.reportSnapshot ? `<img class="report-snapshot" src="${state.reportSnapshot}" alt="현재 구조 스냅샷" />` : ""}

        <div class="report-sections">
          <section>
            <h3>구조 개요</h3>
            <p>${escapeHtml(protein.description)}</p>
          </section>
          <section>
            <h3>기능 요약</h3>
            <ul>
              ${protein.features.map(([, title, text]) => `<li><strong>${escapeHtml(title)}:</strong> ${escapeHtml(text)}</li>`).join("")}
            </ul>
          </section>
          <section>
            <h3>근거 문장</h3>
            ${(evidence?.claims?.length ? evidence.claims : [])
              .slice(0, 4)
              .map(
                (claim) => `
                  <article class="claim-card">
                    <p>${escapeHtml(claim.sentence)}</p>
                    <a href="${escapeHtml(claim.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(claim.sourceTitle)}</a>
                    <span>${escapeHtml(claim.journal)} · ${escapeHtml(claim.year)}</span>
                  </article>
                `
              )
              .join("") || "<p>논문 근거가 아직 준비되지 않았습니다.</p>"}
          </section>
          <section>
            <h3>참고문헌</h3>
            <ol>
              ${(evidence?.articles || []).slice(0, 5).map((article) => `<li>${escapeHtml(article.title)} (${escapeHtml(article.year)})</li>`).join("") || "<li>표시할 참고문헌이 없습니다.</li>"}
            </ol>
          </section>
        </div>

        <textarea class="markdown-source" readonly>${escapeHtml(markdown)}</textarea>
        <div class="report-actions">
          <button type="button" data-copy-report>Markdown 복사</button>
          <button type="button" data-download-report>Markdown 저장</button>
          <button type="button" data-print-report>PDF 인쇄</button>
        </div>
      </section>
    </div>
  `;
}

function renderUpgradeModal() {
  return `
    <div class="upgrade-backdrop" data-upgrade-close>
      <section class="upgrade-modal" role="dialog" aria-modal="true" aria-labelledby="upgrade-title">
        <button class="modal-close" type="button" data-upgrade-close aria-label="닫기">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>
        </button>
        <span class="upgrade-kicker">FoldNote Pro</span>
        <h2 id="upgrade-title">리포트 생성은 Pro 기능입니다</h2>
        <p>구조 요약, 기능 요약, 근거 문장, 참고문헌, 스냅샷을 한 번에 묶어 Markdown/PDF 리포트로 내보내는 기능입니다.</p>
        <div class="upgrade-grid">
          <div><strong>학생/연구자</strong><span>과제, 논문 조사, 발표 자료 초안</span></div>
          <div><strong>랩/팀</strong><span>프로젝트별 구조 노트와 참고문헌 정리</span></div>
          <div><strong>바이오 스타트업</strong><span>타깃 단백질 검토 리포트</span></div>
        </div>
        <div class="upgrade-price">
          <strong>Pro 예상가</strong>
          <span>월 9,900원부터</span>
        </div>
        <div class="upgrade-actions">
          <button type="button" data-open-report-preview>무료 미리보기 열기</button>
          <button type="button" data-upgrade-close>나중에</button>
        </div>
      </section>
    </div>
  `;
}

function renderDetailedInfo(protein) {
  const structureId = protein.pdbId || protein.accession || "AlphaFold";
  const confidenceLabel = protein.source === "PDB" ? "B-factor 해석" : "pLDDT 해석";

  return `
    <section class="section pro-section">
      <h3>구조 판독</h3>
      <dl class="detail-list">
        <div><dt>Entry</dt><dd>${escapeHtml(structureId)}</dd></div>
        <div><dt>Source</dt><dd>${escapeHtml(protein.source)}</dd></div>
        <div><dt>Method</dt><dd>${escapeHtml(protein.method)}</dd></div>
        <div><dt>Resolution</dt><dd>${escapeHtml(protein.resolution)}</dd></div>
      </dl>
    </section>

    <section class="section pro-section">
      <h3>분석 포인트</h3>
      <div class="analysis-list">
        <p><strong>도메인/사슬:</strong> 리본 보기에서 사슬 흐름과 접힘 단위를 먼저 확인한 뒤, 스틱 보기로 결합 부위 주변 원자 배치를 좁혀보세요.</p>
        <p><strong>${confidenceLabel}:</strong> 신뢰도 색상은 구조의 확실한 영역과 유연하거나 조건 의존적인 영역을 구분하는 기준으로 쓰면 좋습니다.</p>
        <p><strong>해석 범위:</strong> 단일 구조는 특정 조건의 스냅샷입니다. 변이, 리간드, pH, 복합체 상태에 따라 다른 배치가 나올 수 있습니다.</p>
      </div>
    </section>

    <section class="section pro-section">
      <h3>다음 확인</h3>
      <div class="check-grid">
        <span>리간드/보조인자</span>
        <span>체인 접촉면</span>
        <span>저신뢰도 루프</span>
        <span>변이 위치</span>
      </div>
    </section>
  `;
}

function renderComparisonPanel(protein) {
  const candidates = state.results
    .filter((candidate) => getProteinKey(candidate) !== getProteinKey(protein))
    .slice(0, 3);
  const predictionCompare = buildPredictionComparison(protein);

  return `
    <section class="section pro-section">
      <h3>구조 비교</h3>
      <p class="section-lead">검색된 상태별 구조를 나란히 보면서 결합 상태와 기능 차이를 비교합니다.</p>
      <button class="prediction-toggle" type="button" data-prediction-compare>
        ${state.showPredictionCompare ? "PDB/AlphaFold 비교 접기" : "PDB 실험 구조와 AlphaFold 예측 비교"}
      </button>
      ${state.showPredictionCompare ? renderPredictionComparison(predictionCompare) : ""}
      <div class="compare-grid">
        <div>
          <strong>현재 구조</strong>
          <span>${escapeHtml(protein.source)} · ${escapeHtml(protein.method)} · ${escapeHtml(protein.resolution)}</span>
          <p>${escapeHtml(getCurrentComparisonHint(protein))}</p>
        </div>
        ${candidates.length
          ? candidates
              .map(
                (candidate) => `
                  <button type="button" data-compare-key="${escapeHtml(getProteinKey(candidate))}">
                    <strong>${escapeHtml(getDisplayName(candidate))}</strong>
                    <span>${escapeHtml(candidate.source)} · ${escapeHtml(candidate.method)} · ${escapeHtml(candidate.resolution)}</span>
                    <p>${escapeHtml(getCandidateComparisonHint(candidate, protein))}</p>
                    <em>${escapeHtml(getComparisonDelta(candidate, protein))}</em>
                  </button>
                `
              )
              .join("")
          : "<p>검색 결과가 더 있으면 비교 후보가 여기에 표시됩니다.</p>"}
      </div>
    </section>
  `;
}

function getCurrentComparisonHint(protein) {
  return stripTrailingStructureId(localizedStateReason(protein) || localizedQuickSummary(protein), protein);
}

function getCandidateComparisonHint(candidate, current) {
  const reason = stripTrailingStructureId(localizedStateReason(candidate) || localizedQuickSummary(candidate), candidate);
  if (reason) return reason;
  return `${getDisplayName(current)}와 같은 단백질 계열의 다른 구조 후보입니다. 결합 분자, 해상도, 사슬 조립 상태를 비교해 보세요.`;
}

function getComparisonDelta(candidate, current) {
  const differences = [];
  const candidateState = localizedStateLabel(candidate);
  const currentState = localizedStateLabel(current);
  const candidateResolution = parseResolutionValue(candidate.resolution);
  const currentResolution = parseResolutionValue(current.resolution);

  if (candidateState && currentState && normalizeForCompare(candidateState) !== normalizeForCompare(currentState)) {
    differences.push(`상태: ${currentState} → ${candidateState}`);
  }

  if (candidate.source && current.source && candidate.source !== current.source) {
    differences.push(`출처: ${current.source} → ${candidate.source}`);
  }

  if (Number.isFinite(candidateResolution) && Number.isFinite(currentResolution)) {
    const delta = candidateResolution - currentResolution;
    if (Math.abs(delta) >= 0.05) {
      differences.push(`해상도: ${delta > 0 ? "더 낮음" : "더 높음"} (${candidate.resolution})`);
    }
  } else if (candidate.resolution && candidate.resolution !== current.resolution) {
    differences.push(`해상도: ${candidate.resolution}`);
  }

  return differences.length
    ? differences.slice(0, 2).join(" · ")
    : "비슷해 보이면 리간드, 체인 수, 결합 부위 주변 잔기 배치를 비교하세요.";
}

function parseResolutionValue(value) {
  const match = String(value || "").match(/\d+(?:\.\d+)?/);
  return match ? Number.parseFloat(match[0]) : Number.NaN;
}

function buildPredictionComparison(protein) {
  const pdbCandidate = protein.source === "PDB" ? protein : state.results.find((item) => item.source === "PDB");
  const alphaCandidate = protein.source === "AlphaFold" ? protein : state.results.find((item) => item.source === "AlphaFold");
  const alphaUrl = protein.accession
    ? protein.externalUrl
    : `https://alphafold.ebi.ac.uk/search/text/${encodeURIComponent(protein.englishName || protein.name)}`;

  return {
    pdb: pdbCandidate,
    alpha: alphaCandidate,
    alphaUrl
  };
}

function renderPredictionComparison(compare) {
  return `
    <div class="prediction-compare">
      <article>
        <strong>PDB 실험 구조</strong>
        <span>${compare.pdb ? escapeHtml(compare.pdb.pdbId || compare.pdb.name) : "현재 검색 결과에 PDB 구조가 없습니다."}</span>
        <p>실험 조건에서 관찰된 구조입니다. 해상도, 결합 분자, 누락 잔기, 결정 조건을 함께 봐야 합니다.</p>
      </article>
      <article>
        <strong>AlphaFold 예측 구조</strong>
        <span>${compare.alpha ? escapeHtml(compare.alpha.accession || compare.alpha.alphaFoldId || compare.alpha.name) : "AlphaFold 검색으로 예측 모델을 확인할 수 있습니다."}</span>
        <p>단일 사슬의 접힘과 도메인 윤곽을 빠르게 볼 수 있지만, 복합체나 결합 상태는 별도 근거가 필요합니다.</p>
        ${compare.alpha ? "" : `<a href="${escapeHtml(compare.alphaUrl)}" target="_blank" rel="noreferrer">AlphaFold에서 검색</a>`}
      </article>
      <div class="prediction-note">
        <strong>해석 팁</strong>
        <p>PDB는 실제 관찰 조건에 강하고, AlphaFold는 전체 접힘 예측에 강합니다. 둘이 다르면 유연한 루프, 결합 상태, 복합체 형성 여부를 먼저 의심해보세요.</p>
      </div>
    </div>
  `;
}

function renderVariantPanel(protein) {
  const variant = parseVariant(state.variantQuery);
  const interpretation = variant
    ? [
        `${variant.from}${variant.position}${variant.to} 변이는 ${variant.position}번 잔기 주변의 결합, 접힘, 표면 노출을 확인해야 합니다.`,
        "구조상으로는 주변 5-8 A 영역의 전하, 크기, 소수성 변화가 기능 영향의 첫 단서가 됩니다.",
        "이 결과는 연구/교육용 해석이며 진단, 치료, 임상 의사결정 목적으로 사용하면 안 됩니다."
      ]
    : [];

  return `
    <section class="section pro-section">
      <h3>변이 해석</h3>
      <p class="section-lead">예: p53 R175H, EGFR L858R처럼 입력하면 구조에서 볼 포인트를 정리합니다.</p>
      <div class="variant-box">
        <input type="text" data-variant-input value="${escapeHtml(state.variantQuery)}" placeholder="예: R175H" />
        <button type="button" data-highlight-variant ${variant ? "" : "disabled"}>위치 표시</button>
      </div>
      ${variant
        ? `<div class="analysis-list">${interpretation.map((text) => `<p>${escapeHtml(text)}</p>`).join("")}</div>`
        : `<div class="evidence-empty">변이를 입력하면 주변 잔기와 기능 영향 확인 포인트를 보여줍니다.</div>`}
    </section>
  `;
}

function renderResearchTools(protein) {
  const literatureUrl = buildLiteratureSearchUrl(protein);
  const saved = isSaved(protein, state.notes);

  return `
    <section class="section compact-section">
      <h3>연구자 도구</h3>
      <div class="tool-grid">
        <button class="secondary-button" type="button" data-copy-id="${escapeHtml(protein.pdbId || protein.accession || "")}">ID 복사</button>
        <a class="secondary-button link-button" href="${escapeHtml(protein.cifDownloadUrl)}" target="_blank" rel="noreferrer">mmCIF</a>
        <a class="secondary-button link-button" href="${escapeHtml(protein.pdbDownloadUrl)}" target="_blank" rel="noreferrer">PDB 파일</a>
        <a class="secondary-button link-button" href="${escapeHtml(literatureUrl)}" target="_blank" rel="noreferrer">논문 검색</a>
      </div>
    </section>

    <div class="action-row">
      <a class="primary-button link-button" href="${escapeHtml(protein.externalUrl)}" target="_blank" rel="noreferrer">${protein.source === "PDB" ? "PDB에서 보기" : "AlphaFold 보기"}</a>
      <button class="secondary-button" type="button" data-save-note>${saved ? "저장됨" : "노트 저장"}</button>
    </div>
    <button class="report-button" type="button" data-open-report>Pro 리포트 생성</button>
    ${state.saveMessage ? `<div class="save-message">${escapeHtml(state.saveMessage)}</div>` : ""}
  `;
}

function buildLiteratureSearchUrl(protein) {
  const term = protein.pdbId || protein.accession || protein.englishName || protein.name;
  const query = `"${term}" protein structure function`;
  return `https://europepmc.org/search?query=${encodeURIComponent(query)}`;
}

function renderColorLegend(protein) {
  if (state.viewerStyle === "cartoon") {
    return `
      <div class="viewer-legend">
        <h3>리본 보기</h3>
        <div><span class="spectrum"></span>사슬의 처음부터 끝까지 이어지는 접힘 흐름</div>
        <div><span style="background:#58c4dd"></span>나선과 판이 만드는 전체 골격</div>
        <div><span style="background:#f59e0b"></span>색이 바뀌는 구간은 다른 영역이나 사슬 경계를 보기 좋습니다</div>
      </div>
    `;
  }

  if (state.viewerStyle === "surface") {
    return `
      <div class="viewer-legend">
        <h3>표면 보기</h3>
        <div><span style="background:#ffffff;border:1px solid #cbd5e1"></span>흰 표면: 용매가 닿는 단백질 바깥쪽</div>
        <div><span class="spectrum"></span>안쪽 리본: 표면 아래의 사슬 흐름</div>
        <div><span style="background:#4ade80"></span>홈이나 패인 곳은 결합 부위 후보로 볼 수 있습니다</div>
      </div>
    `;
  }

  if (state.viewerStyle === "confidence") {
    return `
      <div class="viewer-legend">
        <h3>신뢰도 색상</h3>
        <div><span style="background:#1f5eff"></span>파랑: 안정적이고 해석 신뢰가 높은 구간</div>
        <div><span style="background:#19a7ce"></span>청록: 대체로 믿을 수 있는 접힘</div>
        <div><span style="background:#f2c94c"></span>노랑: 유연하거나 조건에 따라 달라질 수 있음</div>
        <div><span style="background:#f97316"></span>주황: 위치 해석을 조심해야 하는 구간</div>
      </div>
    `;
  }

  if (state.viewerStyle === "stick" || state.viewerStyle === "sphere") {
    return `
      <div class="viewer-legend">
        <h3>원자 색상</h3>
        <div><span style="background:#909090"></span>탄소 C</div>
        <div><span style="background:#3050f8"></span>질소 N</div>
        <div><span style="background:#ff0d0d"></span>산소 O</div>
        <div><span style="background:#ffff30"></span>황 S</div>
      </div>
    `;
  }

  return "";
}

function bindEvents() {
  const input = document.querySelector("[data-search-input]");
  const form = document.querySelector("[data-search-form]");

  document.querySelectorAll("[data-home]").forEach((homeButton) => {
    homeButton.addEventListener("click", () => {
      window.clearTimeout(state.debounceTimer);
      state.query = "";
      state.results = [];
      state.error = "";
      state.notice = "";
      state.isLoading = false;
      state.selected = null;
      state.viewer = null;
      state.isLearningOpen = false;
      render();
    });
  });

  const learningOpenButton = document.querySelector("[data-learning-open]");
  if (learningOpenButton) {
    learningOpenButton.addEventListener("click", () => {
      state.selected = null;
      state.viewer = null;
      state.isSidebarOpen = false;
      state.isLearningOpen = true;
      render();
    });
  }

  const themeButton = document.querySelector("[data-theme-toggle]");
  if (themeButton) {
    themeButton.addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      render();
    });
  }

  const sidebarToggle = document.querySelector("[data-sidebar-toggle]");
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      state.isSidebarOpen = true;
      render();
    });
  }

  document.querySelectorAll("[data-sidebar-close]").forEach((button) => {
    button.addEventListener("click", () => {
      state.isSidebarOpen = false;
      render();
    });
  });

  document.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => {
      state.language = button.dataset.language;
      window.localStorage.setItem("foldnote-language", state.language);
      render();
    });
  });

  const helpOpenButton = document.querySelector("[data-help-open]");
  if (helpOpenButton) {
    helpOpenButton.addEventListener("click", () => {
      state.isHelpOpen = true;
      render();
    });
  }

  document.querySelectorAll("[data-help-close]").forEach((element) => {
    element.addEventListener("click", (event) => {
      if (event.target !== element && !element.classList.contains("modal-close")) return;
      state.isHelpOpen = false;
      render();
    });
  });

  document.onkeydown = (event) => {
    if (event.key === "Escape" && state.isSidebarOpen) {
      state.isSidebarOpen = false;
      render();
      return;
    }
    if (event.key === "Escape" && state.isHelpOpen) {
      state.isHelpOpen = false;
      render();
      return;
    }
    if (event.key === "Escape" && state.isUpgradeOpen) {
      state.isUpgradeOpen = false;
      render();
    }
  };

  if (input && !state.isHelpOpen && document.activeElement !== input) {
    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
    input.addEventListener("compositionstart", () => {
      state.isComposing = true;
    });
    input.addEventListener("compositionend", (event) => {
      state.isComposing = false;
      scheduleSearch(event.target.value);
    });
    input.addEventListener("input", (event) => {
      if (state.isComposing || event.isComposing) {
        state.query = event.target.value;
        return;
      }
      scheduleSearch(event.target.value);
    });
    input.addEventListener("search", (event) => {
      scheduleSearch(event.target.value);
    });
  }

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      window.clearTimeout(state.debounceTimer);
      const token = state.searchToken + 1;
      state.searchToken = token;
      searchRcsb(input ? input.value : state.query, token);
    });
  }

  document.querySelectorAll("[data-result]").forEach((button) => {
    button.addEventListener("click", () => {
      state.isLearningOpen = false;
      state.selected = state.results[Number(button.dataset.result)];
      state.recentProteins = recordRecentProtein(state.selected);
      render();
    });
  });

  document.querySelectorAll("[data-open-note]").forEach((button) => {
    button.addEventListener("click", () => {
      const note = state.notes.find((item) => item.id === button.dataset.openNote);
      if (!note) return;
      scheduleSearch(note.structureId || note.englishName || note.name);
    });
  });

  document.querySelectorAll("[data-delete-note]").forEach((button) => {
    button.addEventListener("click", () => {
      state.notes = deleteNote(button.dataset.deleteNote);
      render();
    });
  });

  document.querySelectorAll("[data-project-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentProjectId = button.dataset.projectId;
      state.isSidebarOpen = false;
      render();
    });
  });

  const showProjectFormButton = document.querySelector("[data-show-project-form]");
  if (showProjectFormButton) {
    showProjectFormButton.addEventListener("click", () => {
      state.isProjectFormOpen = true;
      render();
      window.requestAnimationFrame(() => document.querySelector("[data-project-name-input]")?.focus());
    });
  }

  const projectNameInput = document.querySelector("[data-project-name-input]");
  if (projectNameInput) {
    projectNameInput.addEventListener("input", () => {
      state.newProjectName = projectNameInput.value;
    });
  }

  const createProjectForm = document.querySelector("[data-create-project-form]");
  if (createProjectForm) {
    createProjectForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = state.newProjectName.trim();
      if (!name) return;
      state.projects = createProject(name);
      state.newProjectName = "";
      state.isProjectFormOpen = false;
      state.currentProjectId = state.projects[state.projects.length - 1]?.id || DEFAULT_PROJECT_ID;
      state.isSidebarOpen = true;
      render();
    });
  }

  document.querySelectorAll("[data-recent-query]").forEach((button) => {
    button.addEventListener("click", () => {
      scheduleSearch(button.dataset.recentQuery);
    });
  });

  document.querySelectorAll("[data-recommend-query]").forEach((button) => {
    button.addEventListener("click", () => {
      const query = button.dataset.recommendQuery;
      scheduleSearch(query);
    });
  });

  const back = document.querySelector("[data-back]");
  if (back) {
    back.addEventListener("click", () => {
      state.selected = null;
      state.viewer = null;
      render();
    });
  }

  document.querySelectorAll("[data-compare-key]").forEach((button) => {
    button.addEventListener("click", () => {
      const candidate = state.results.find((item) => getProteinKey(item) === button.dataset.compareKey);
      if (!candidate) return;
      state.selected = candidate;
      state.recentProteins = recordRecentProtein(candidate);
      render();
    });
  });

  const predictionCompareButton = document.querySelector("[data-prediction-compare]");
  if (predictionCompareButton) {
    predictionCompareButton.addEventListener("click", () => {
      state.showPredictionCompare = !state.showPredictionCompare;
      render();
    });
  }

  const variantInput = document.querySelector("[data-variant-input]");
  if (variantInput) {
    variantInput.addEventListener("input", () => {
      state.variantQuery = variantInput.value;
      const section = variantInput.closest(".section");
      if (!section) return;
      window.clearTimeout(state.variantTimer);
      state.variantTimer = window.setTimeout(render, 350);
    });
  }

  const highlightVariantButton = document.querySelector("[data-highlight-variant]");
  if (highlightVariantButton) {
    highlightVariantButton.addEventListener("click", () => {
      highlightVariantResidue();
    });
  }

  document.querySelectorAll("[data-view-style]").forEach((button) => {
    button.addEventListener("click", () => {
      state.viewerStyle = button.dataset.viewStyle;
      applyViewerStyle();
      document.querySelectorAll("[data-view-style]").forEach((item) => {
        item.classList.toggle("active", item.dataset.viewStyle === state.viewerStyle);
      });
      updateColorLegend(state.selected);
    });
  });

  document.querySelectorAll("[data-copy-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const value = button.dataset.copyId;
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        button.textContent = "복사됨";
        window.setTimeout(() => {
          button.textContent = "ID 복사";
        }, 1200);
      } catch (error) {
        button.textContent = value;
      }
    });
  });

  const saveNoteButton = document.querySelector("[data-save-note]");
  if (saveNoteButton && state.selected) {
    saveNoteButton.addEventListener("click", () => {
      const key = getProteinKey(state.selected);
      const evidence = state.literature[key];
      state.reportSnapshot = captureViewerSnapshot();
      state.notes = saveNote(state.selected, evidence, state.currentProjectId, state.reportSnapshot);
      state.saveMessage = "Protein Note에 저장했습니다. 홈 화면에서 다시 열 수 있습니다.";
      render();
      window.setTimeout(() => {
        state.saveMessage = "";
        render();
      }, 1800);
    });
  }

  const reportOpenButton = document.querySelector("[data-open-report]");
  if (reportOpenButton) {
    reportOpenButton.addEventListener("click", () => {
      state.reportSnapshot = captureViewerSnapshot();
      state.isUpgradeOpen = true;
      render();
    });
  }

  document.querySelectorAll("[data-upgrade-close]").forEach((element) => {
    element.addEventListener("click", (event) => {
      if (event.target !== element && !element.classList.contains("modal-close")) return;
      state.isUpgradeOpen = false;
      render();
    });
  });

  const reportPreviewButton = document.querySelector("[data-open-report-preview]");
  if (reportPreviewButton) {
    reportPreviewButton.addEventListener("click", () => {
      state.isUpgradeOpen = false;
      state.isReportOpen = true;
      render();
    });
  }

  document.querySelectorAll("[data-report-close]").forEach((element) => {
    element.addEventListener("click", (event) => {
      if (event.target !== element && !element.classList.contains("modal-close")) return;
      state.isReportOpen = false;
      render();
    });
  });

  const copyReportButton = document.querySelector("[data-copy-report]");
  if (copyReportButton && state.selected) {
    copyReportButton.addEventListener("click", async () => {
      await navigator.clipboard.writeText(buildReportMarkdown(state.selected, state.literature[getProteinKey(state.selected)]));
      copyReportButton.textContent = "복사됨";
    });
  }

  const downloadReportButton = document.querySelector("[data-download-report]");
  if (downloadReportButton && state.selected) {
    downloadReportButton.addEventListener("click", () => {
      downloadText(`${getProteinKey(state.selected)}-foldnote-report.md`, buildReportMarkdown(state.selected, state.literature[getProteinKey(state.selected)]));
    });
  }

  const printReportButton = document.querySelector("[data-print-report]");
  if (printReportButton) {
    printReportButton.addEventListener("click", () => window.print());
  }
}

function formatSavedDate(value) {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "short",
      day: "numeric"
    }).format(new Date(value));
  } catch {
    return "저장됨";
  }
}

function parseVariant(value) {
  const match = String(value || "").trim().match(/^([A-Za-z])\s*([0-9]+)\s*([A-Za-z])$/);
  if (!match) return null;
  return {
    from: match[1].toUpperCase(),
    position: Number(match[2]),
    to: match[3].toUpperCase()
  };
}

function highlightVariantResidue() {
  const variant = parseVariant(state.variantQuery);
  if (!variant || !state.viewer) return;
  applyViewerStyle();
  state.viewer.setStyle({ resi: variant.position }, { stick: { radius: 0.32, color: "#f97316" } });
  state.viewer.zoomTo({ resi: variant.position });
  state.viewer.render();
}

function captureViewerSnapshot() {
  const canvas = document.querySelector("[data-protein-viewer] canvas");
  try {
    return canvas ? canvas.toDataURL("image/png") : "";
  } catch {
    return "";
  }
}

function buildReportMarkdown(protein, evidence) {
  const claims = evidence?.claims || [];
  const articles = evidence?.articles || [];
  const lines = [
    `# ${protein.name} FoldNote Report`,
    "",
    "## 구조 개요",
    `- Source: ${protein.source}`,
    `- ID: ${protein.pdbId || protein.accession || "AlphaFold"}`,
    `- Organism: ${protein.organism}`,
    `- Method: ${protein.method}`,
    `- Resolution: ${protein.resolution}`,
    "",
    protein.description,
    "",
    "## 기능 요약",
    ...protein.features.map(([, title, text]) => `- **${title}:** ${text}`),
    "",
    "## 근거 문장",
    ...(claims.length
      ? claims.slice(0, 5).map((claim) => `- ${claim.sentence} (${claim.year}, ${claim.journal}) ${claim.sourceUrl}`)
      : ["- 논문 근거가 아직 준비되지 않았습니다."]),
    "",
    "## 참고문헌",
    ...(articles.length
      ? articles.slice(0, 6).map((article, index) => `${index + 1}. ${article.title} (${article.year}) ${article.url}`)
      : ["1. 표시할 참고문헌이 없습니다."]),
    "",
    "## 주의",
    "자동 생성된 연구/교육용 요약입니다. 진단, 치료, 임상 의사결정 목적으로 사용하지 마세요."
  ];
  return lines.join("\n");
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function initProteinViewer(protein) {
  const container = document.querySelector("[data-protein-viewer]");
  if (!container || !protein.structureUrl) return;

  if (!window.$3Dmol) {
    showViewerMessage("3Dmol 뷰어 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.");
    return;
  }

  try {
    const structureText = await fetchText(protein.structureUrl);
    container.innerHTML = "";
    state.viewer = window.$3Dmol.createViewer(container, {
      backgroundColor: "#111827",
      antialias: true
    });

    state.viewer.addModel(structureText, "cif");
    applyViewerStyle();
    registerAtomClickHandler();
    state.viewer.zoomTo();
    state.viewer.spin(false);
    state.viewer.render();
  } catch (error) {
    showViewerMessage(`${protein.pdbId || protein.accession || protein.name} 구조 파일을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.`);
  }
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`구조 파일 요청 실패 (${response.status})`);
  return response.text();
}

function applyViewerStyle() {
  if (!state.viewer || !window.$3Dmol) return;

  state.viewer.setStyle({}, {});
  state.viewer.removeAllSurfaces();

  if (state.viewerStyle === "stick") {
    state.viewer.setStyle({ hetflag: false }, { stick: { radius: 0.16, colorscheme: "Jmol" } });
    state.viewer.setStyle({ hetflag: true }, { stick: { radius: 0.26, colorscheme: "greenCarbon" } });
  } else if (state.viewerStyle === "sphere") {
    state.viewer.setStyle({}, { sphere: { scale: 0.28, colorscheme: "Jmol" } });
  } else if (state.viewerStyle === "surface") {
    state.viewer.setStyle({ hetflag: false }, { cartoon: { color: "spectrum", opacity: 0.36 } });
    state.viewer.addSurface(
      window.$3Dmol.SurfaceType.VDW,
      { opacity: 0.62, color: "white" },
      { hetflag: false }
    );
    state.viewer.setStyle({ hetflag: true }, { stick: { radius: 0.22, colorscheme: "greenCarbon" } });
  } else if (state.viewerStyle === "confidence") {
    state.viewer.setStyle(
      { hetflag: false },
      {
        cartoon: {
          colorfunc: (atom) => confidenceColor(atom.b)
        }
      }
    );
    state.viewer.setStyle({ hetflag: true }, { stick: { radius: 0.22, colorscheme: "greenCarbon" } });
  } else {
    state.viewer.setStyle({ hetflag: false }, { cartoon: { color: "spectrum" } });
    state.viewer.setStyle({ hetflag: true }, { stick: { radius: 0.24, colorscheme: "greenCarbon" } });
  }

  state.viewer.render();
}

function registerAtomClickHandler() {
  if (!state.viewer) return;
  state.viewer.setClickable({}, true, (atom, viewer, event) => {
    showAtomTooltip(atom, event);
  });
}

function showAtomTooltip(atom, event) {
  const tooltip = document.querySelector("[data-atom-tooltip]");
  if (!tooltip || !atom) return;

  const residueName = atom.resn || "알 수 없는 잔기";
  const residueNumber = atom.resi || "-";
  const chain = atom.chain || atom.chainId || "-";
  const element = atom.elem || atom.element || "원자";
  const atomName = atom.atom || atom.name || element;
  const confidence = typeof atom.b === "number" ? Math.round(atom.b) : null;
  const details = describeResidue(residueName, atomName, element, confidence);
  const pane = document.querySelector(".viewer-pane");
  const paneRect = pane.getBoundingClientRect();
  const clientX = event?.clientX ?? paneRect.left + paneRect.width / 2;
  const clientY = event?.clientY ?? paneRect.top + paneRect.height / 2;
  const x = Math.min(Math.max(clientX - paneRect.left + 14, 12), paneRect.width - 286);
  const y = Math.min(Math.max(clientY - paneRect.top + 14, 12), paneRect.height - 190);

  tooltip.innerHTML = `
    <strong>${escapeHtml(residueName)} ${escapeHtml(residueNumber)}</strong>
    <span>체인 ${escapeHtml(chain)} · ${escapeHtml(atomName)} 원자${confidence === null ? "" : ` · 값 ${confidence}`}</span>
    <p>${escapeHtml(details.summary)}</p>
    <ul>
      ${details.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
    </ul>
  `;
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
  tooltip.classList.add("visible");

  window.clearTimeout(tooltip.hideTimer);
  tooltip.hideTimer = window.setTimeout(() => {
    tooltip.classList.remove("visible");
  }, 4200);
}

function describeResidue(residueName, atomName, element, confidence) {
  const residue = residueDescriptions[residueName?.toUpperCase()] || "이 위치는 단백질을 이루는 아미노산 잔기입니다.";
  return {
    summary: residue,
    points: [
      residueProfile(residueName?.toUpperCase()),
      describeAtomRole(atomName, element),
      describeStructureValue(confidence)
    ].filter(Boolean)
  };
}

function residueProfile(code) {
  const profiles = {
    ALA: "성질: 작고 소수성인 잔기라 내부 포장과 나선 안정화에 자주 관여합니다.",
    ARG: "성질: 양전하를 띠어 DNA, RNA, 인산기, 산성 잔기와 결합하기 좋습니다.",
    ASN: "성질: 극성 잔기라 표면 수소결합과 당화 위치 해석에 자주 등장합니다.",
    ASP: "성질: 음전하를 띠어 염다리, 금속 결합, 촉매 부위에 자주 관여합니다.",
    CYS: "성질: 황을 포함해 이황화 결합이나 금속 결합으로 구조를 고정할 수 있습니다.",
    GLN: "성질: 극성 잔기라 긴 곁사슬로 표면 수소결합을 만들기 좋습니다.",
    GLU: "성질: 음전하를 띠는 산성 잔기라 염다리와 촉매 부위에서 중요합니다.",
    GLY: "성질: 가장 작은 잔기라 촘촘한 회전부, 루프, 유연한 연결부에 자주 있습니다.",
    HIS: "성질: pH와 금속 결합에 민감해 효소 활성 부위에서 자주 보입니다.",
    ILE: "성질: 소수성 잔기라 단백질 내부 코어를 단단히 채우는 역할을 합니다.",
    LEU: "성질: 소수성 잔기라 나선 내부 포장과 단백질 코어 안정화에 흔합니다.",
    LYS: "성질: 양전하를 띠어 DNA/RNA, 산성 잔기, 표면 결합 부위와 연결됩니다.",
    MET: "성질: 황을 포함한 소수성 잔기이며 번역 시작 잔기로도 쓰입니다.",
    PHE: "성질: 방향족 소수성 잔기라 내부 포장과 stacking 상호작용에 관여합니다.",
    PRO: "성질: 고리 구조 때문에 사슬 방향을 꺾고 루프나 턴을 만들기 좋습니다.",
    SER: "성질: 작은 극성 잔기라 수소결합과 인산화 조절 위치가 될 수 있습니다.",
    THR: "성질: 극성 잔기라 수소결합, 인산화, 표면 인식에 관여할 수 있습니다.",
    TRP: "성질: 큰 방향족 잔기라 결합 부위와 내부 코어에서 강한 포장 효과를 냅니다.",
    TYR: "성질: 방향족이면서 극성인 잔기라 stacking, 수소결합, 인산화에 관여합니다.",
    VAL: "성질: 소수성 잔기라 내부 코어와 베타 가닥 안정화에 자주 쓰입니다.",
    HEM: "성질: 헴 보조인자로 철 중심을 통해 산소나 작은 분자 결합을 담당합니다.",
    HOH: "성질: 물 분자이며 수소결합 네트워크나 결합 부위 주변 안정화에 관여할 수 있습니다."
  };
  return profiles[code] || "";
}

function describeAtomRole(atomName, element) {
  const name = String(atomName || "").toUpperCase();
  const elem = String(element || "").toUpperCase();
  if (name === "CA") return "클릭 위치: Cα 원자라 단백질 주사슬의 잔기 위치를 대표합니다.";
  if (name === "N") return "클릭 위치: 주사슬 질소 원자라 펩타이드 결합과 수소결합 방향을 볼 때 중요합니다.";
  if (name === "C") return "클릭 위치: 주사슬 카보닐 탄소라 다음 잔기와 이어지는 펩타이드 결합 위치입니다.";
  if (name === "O") return "클릭 위치: 주사슬 카보닐 산소라 수소결합을 받을 수 있는 위치입니다.";
  if (name === "CB") return "클릭 위치: Cβ 원자라 곁사슬이 어느 방향으로 뻗는지 보여줍니다.";
  if (elem === "FE") return "클릭 위치: 철 원자라 헴이나 금속 결합 중심일 가능성이 큽니다.";
  if (elem === "S") return "클릭 위치: 황 원자라 이황화 결합이나 금속 결합 가능성을 확인할 수 있습니다.";
  if (elem === "O") return "클릭 위치: 산소 원자라 수소결합 또는 전하성 상호작용 후보입니다.";
  if (elem === "N") return "클릭 위치: 질소 원자라 수소결합 또는 양전하성 상호작용 후보입니다.";
  if (elem === "C") return "클릭 위치: 탄소 원자라 골격 또는 소수성 접촉을 보는 지점입니다.";
  return `클릭 위치: ${atomName || element} 원자입니다. 주변 잔기와의 거리, 결합, 표면 노출을 함께 보면 좋습니다.`;
}

function describeStructureValue(confidence) {
  if (confidence === null) return "";
  const label = state.selected?.source === "PDB" ? "B-factor" : "pLDDT";
  return `${label} 값: ${confidence}. 비교할 때 같은 색상/값을 가진 주변 구간과 함께 보면 위치 차이를 더 잘 볼 수 있습니다.`;
}

function updateColorLegend(protein) {
  const oldLegend = document.querySelector(".viewer-legend");
  if (!oldLegend || !protein) return;
  oldLegend.outerHTML = renderColorLegend(protein);
}

function confidenceColor(value) {
  if (value >= 90) return "#1f5eff";
  if (value >= 70) return "#19a7ce";
  if (value >= 50) return "#f2c94c";
  return "#f97316";
}

const translations = {
  ko: {
    home: "홈으로",
    language: "언어 선택",
    brandSubtitle: "단백질 구조를 쉽게 읽는 노트",
    heroTitle: "단백질 구조를 검색하세요",
    heroText: "단백질 이름이나 PDB ID를 입력하면 구조와 기능, 근거 자료를 함께 확인할 수 있습니다",
    searchPlaceholder: "예: p53, 헤모글로빈, 인슐린, 스파이크 단백질, 1HHO...",
    loadingTitle: "RCSB PDB에서 후보를 찾고 있습니다",
    loadingText: "검색어를 PDB 실험 구조 데이터베이스에 질의하는 중입니다.",
    organism: "생물종",
    evidenceHint: "전문 탭에서 논문 근거 확인",
    basicInfo: "기본정보",
    groupedCount: "개 구조 비교",
    otherState: "비교 후보",
    otherStateReason: "실험 조건이나 결합 상태가 다른 구조입니다.",
    description: "설명",
    keyFeatures: "주요 특징",
    structureView: "실제 구조 시각화",
    cartoon: "리본",
    stick: "스틱",
    sphere: "구체",
    surface: "표면",
    confidence: "신뢰도",
    cartoonView: "리본 보기",
    stickView: "원자 결합 보기",
    sphereView: "공간 채움 보기",
    surfaceView: "분자 표면 보기",
    confidenceView: "B-factor 또는 pLDDT 색상 보기",
    researchMode: "연구 모드",
    classroomMode: "교육 모드",
    basic: "기본",
    professional: "전문",
    method: "방법",
    resolution: "해상도",
    size: "크기",
    mass: "분자량",
    recommendTitle: "오늘의 추천 단백질",
    recommendText: "어디서부터 볼지 모르겠다면 이런 단백질부터 시작해보세요.",
    tipsTitle: "검색 팁",
    tipName: "한글 또는 영문 단백질 이름으로 검색할 수 있습니다",
    tipPdb: "PDB ID(예: 1HHO)로 직접 검색도 가능합니다",
    tipEvidence: "전문 탭에서 관련 초록, 연관 DNA/RNA/단백질, 참고문헌을 볼 수 있습니다"
  },
  en: {
    home: "Home",
    language: "Language",
    brandSubtitle: "Readable notes for protein structures",
    heroTitle: "Search protein structures",
    heroText: "Enter a protein name or PDB ID to inspect structure, function, and supporting evidence.",
    searchPlaceholder: "Try p53, hemoglobin, insulin, spike protein, 1HHO...",
    loadingTitle: "Searching RCSB PDB",
    loadingText: "Querying the experimental structure database for matching entries.",
    organism: "Organism",
    evidenceHint: "Open the professional tab for literature evidence",
    basicInfo: "Basic info",
    groupedCount: "structures to compare",
    otherState: "Other state",
    otherStateReason: "This structure differs by experimental condition, ligand, or binding state.",
    description: "Description",
    keyFeatures: "Key features",
    structureView: "structure viewer",
    cartoon: "Ribbon",
    stick: "Stick",
    sphere: "Sphere",
    surface: "Surface",
    confidence: "Confidence",
    cartoonView: "Ribbon view",
    stickView: "Atomic bond view",
    sphereView: "Space filling view",
    surfaceView: "Molecular surface view",
    confidenceView: "B-factor or pLDDT color view",
    researchMode: "Research",
    classroomMode: "Classroom",
    basic: "Basic",
    professional: "Professional",
    method: "Method",
    resolution: "Resolution",
    size: "Size",
    mass: "Mass",
    recommendTitle: "Recommended proteins",
    recommendText: "Start with these proteins if you are not sure what to explore first.",
    tipsTitle: "Search tips",
    tipName: "Search by Korean or English protein names.",
    tipPdb: "You can also search directly by PDB ID, such as 1HHO.",
    tipEvidence: "Open the professional tab to see abstracts, related DNA/RNA/proteins, and references."
  }
};

function t(key) {
  return translations[state.language]?.[key] || translations.ko[key] || key;
}

function formatGroupedCount(count) {
  return state.language === "ko" ? `${count}${t("groupedCount")}` : `${count} ${t("groupedCount")}`;
}

function getDisplayName(protein) {
  if (state.language === "ko") {
    return protein.koreanName || protein.name;
  }
  return protein.englishName || protein.name;
}

function getSecondaryName(protein) {
  if (state.language === "ko") {
    return protein.englishName || protein.name;
  }
  return protein.koreanName || protein.name;
}

function getStateDisplayName(stateItem) {
  if (state.language === "en") {
    return stateItem.englishName || stateItem.name;
  }
  return stateItem.name || stateItem.koreanName || stateItem.englishName;
}

function getOriginalStructureName(item) {
  return item.englishName || item.protein?.englishName || item.name || item.protein?.name || "";
}

function getStructureTagName(item) {
  return item.protein?.name || item.name || item.koreanName || item.englishName || "Structure";
}

function getStructureTagId(item) {
  return item.id || item.pdbId || item.protein?.pdbId || item.accession || item.protein?.accession || item.alphaFoldId || item.protein?.alphaFoldId || "";
}

function renderStructureTags(item) {
  const tags = [
    item.isRepresentative ? (state.language === "en" ? "Recommended" : "추천") : "",
    getStructureTagName(item),
    getStructureTagId(item)
  ]
    .filter(Boolean)
    .map((value) => `#${toHashTag(value)}`);
  return tags
    .map((tag) => `<span class="state-tag ${tag === "#추천" || tag === "#Recommended" ? "representative" : ""}">${escapeHtml(tag)}</span>`)
    .join("");
}

function toHashTag(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w가-힣.-]/g, "")
    .replace(/^-+|-+$/g, "");
}

function localizedStateLabel(item) {
  if (state.language === "en") {
    return item.stateLabelEn || stateLabelFallbackEn(item.stateLabel) || t("otherState");
  }
  return item.stateLabel || t("otherState");
}

function localizedStateReason(item) {
  if (state.language === "en") {
    return item.stateReasonEn || stateReasonFallbackEn(item);
  }
  return item.stateReason || t("otherStateReason");
}

function stateLabelFallbackEn(label) {
  const map = {
    "성인형": "Adult form",
    "산소 결합": "Oxygen-bound",
    "산소 결합형": "Oxygen-bound",
    "산소 없음": "Unbound",
    "비결합형": "Unbound",
    "CO 결합": "CO-bound",
    "CO 결합형": "CO-bound",
    "산화형": "Oxidized",
    "태아형": "Fetal form",
    "변이형": "Variant",
    "결합형": "Bound form",
    "전이상태 복합체": "Transition-state complex",
    "올리고머형": "Oligomeric form",
    "모델/단편 구조": "Model or fragment",
    "평균 모델": "Averaged model",
    "Hyp 반복 단편": "Hyp-repeat fragment",
    "Pro-Pro-Gly 반복": "Pro-Pro-Gly repeat",
    "삼중나선 모델": "Triple-helix model",
    "반복 끊김 변형": "Repeat-disrupted fragment",
    "정제 결정 구조": "Refined crystal structure",
    "고해상도 결정 구조": "High-resolution crystal",
    "실험 조건형": "Experimental condition",
    "다른 후보": "Other candidate"
  };
  return map[label] || "";
}

function stateReasonFallbackEn(item) {
  const id = item.id || item.pdbId || item.accession || item.alphaFoldId || "this entry";
  return `This structure differs in condition, bound molecule, resolution, or assembly. (${id})`;
}

function renderProteinTitle(protein) {
  const primary = getDisplayName(protein);
  const secondary = getSecondaryName(protein);
  if (!secondary || normalizeForCompare(primary) === normalizeForCompare(secondary)) {
    return escapeHtml(primary);
  }
  return `${escapeHtml(primary)} <span class="english-name">(${escapeHtml(secondary)})</span>`;
}

function normalizeForCompare(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "");
}

function showViewerMessage(message) {
  const container = document.querySelector("[data-protein-viewer]");
  if (!container) return;
  container.innerHTML = `<div class="viewer-loading error">${escapeHtml(message)}</div>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

render();
