import {
  icons,
  recommendedProteins,
  residueDescriptions
} from "./src/catalog.js";
import { generateLearningExpansion } from "./src/learningAiService.js";
import { fetchLiteratureEvidence } from "./src/literatureService.js";
import {
  DEFAULT_PROJECT_ID,
  deleteRecentProtein,
  deleteNote,
  getProteinKey as getStoredProteinKey,
  isSaved,
  loadNotes,
  loadRecentProteins,
  recordRecentProtein,
  saveNote
} from "./src/noteStore.js";
import { findProteinStructures } from "./src/proteinService.js";
import { initAnalytics, trackAnalyticsEvent, trackSearchInput } from "./src/analyticsService.js";

const fixedProjects = [
  { id: DEFAULT_PROJECT_ID, name: "노트", icon: "folder" },
  { id: "note-2", name: "노트", icon: "activity" },
  { id: "note-3", name: "노트", icon: "report" },
  { id: "note-4", name: "노트", icon: "book" }
];

const PROJECT_NAME_KEY = "foldnote.projectNames.v1";

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
  structureFacts: {},
  literature: {},
  literatureErrors: {},
  literatureLoading: {},
  recommendations: [],
  theme: "light",
  isHelpOpen: false,
  notes: loadNotes(),
  projectNames: loadProjectNames(),
  projectRenameTimer: null,
  currentProjectId: DEFAULT_PROJECT_ID,
  recentProteins: loadRecentProteins(),
  saveMessage: "",
  isReportOpen: false,
  isUpgradeOpen: false,
  reportSnapshot: "",
  variantQuery: "",
  isSidebarOpen: false,
  isLearningOpen: false,
  learningAi: {
    loading: false,
    content: "",
    error: ""
  },
  activeLearningTopic: "amino",
  language: window.localStorage.getItem("foldnote-language") || "ko"
};

initAnalytics(() => ({
  language: state.language,
  query: state.query,
  selectedId: state.selected ? getProteinKey(state.selected) : "",
  selectedName: state.selected ? getDisplayName(state.selected) : "",
  projectId: state.currentProjectId
}));



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

  trackSearchInput(query);

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
  trackAnalyticsEvent("literature_tab_open", {
    proteinId: key,
    proteinName: getDisplayName(protein)
  });

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
  const showBack = state.selected || state.isLearningOpen;
  return `
    <header class="topbar">
      ${showBack ? `
        <button class="icon-button back-button" type="button" data-back title="${isKo ? "뒤로가기" : "Back"}" aria-label="${isKo ? "뒤로가기" : "Back"}">
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        </button>
      ` : ""}
      ${state.selected || state.isLearningOpen ? "" : `
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
  const topics = getLearningTopics();
  const activeTopic = topics.find((topic) => topic.id === state.activeLearningTopic) || topics[0];

  return `
    <section class="learning-screen">
      <div class="learning-tabs" aria-label="생화학 학습 과목">
        ${topics
          .map(
            (topic, index) => `
              <button class="${topic.id === activeTopic.id ? "active" : ""}" type="button" data-learning-topic="${topic.id}">
                ${renderLearningIcon(topic.icon)}
                <span>${topic.orderLabel || `${index}.`} ${escapeHtml(topic.tab)}</span>
              </button>
            `
          )
          .join("")}
      </div>

      ${activeTopic.type === "glossary" ? renderLearningGlossary(activeTopic) : `
        <div class="lesson-intro">
          <h2>${escapeHtml(activeTopic.title)}</h2>
          <p>${activeTopic.intro}</p>
        </div>

        ${renderLearningAiPanel(activeTopic)}

        <div class="lesson-grid">
          ${activeTopic.cards.map((card) => renderLessonCard(card)).join("")}
        </div>

        ${activeTopic.featurePanel ? renderFeaturePanel(activeTopic.featurePanel) : ""}
        ${activeTopic.conceptPanel ? renderConceptPanel(activeTopic.conceptPanel) : ""}
      `}
    </section>
  `;
}

function renderLearningGlossary(topic) {
  const terms = state.language === "en" ? getEnglishGlossaryTerms() : getKoreanGlossaryTerms();
  return `
    <section class="learning-glossary">
      <div class="learning-glossary-head">
        <h2>${escapeHtml(topic.title)}</h2>
        <p>${topic.intro}</p>
      </div>
      <div class="glossary-grid">
        ${terms
          .map(
            ([term, definition, detail]) => `
              <article>
                <div class="glossary-term-head">
                  <strong>${escapeHtml(term)}</strong>
                  <button type="button" aria-label="${escapeHtml(term)} 자세히 보기">+</button>
                </div>
                <span>${escapeHtml(definition)}</span>
                <p>${escapeHtml(detail || definition)}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderLearningAiPanel(topic) {
  const isKo = state.language === "ko";
  return `
    <section class="learning-ai-panel">
      <div>
        <strong>${isKo ? "AI 학습 확장" : "AI Learning Expansion"}</strong>
        <p>${isKo ? "현재 과목을 바탕으로 추가 개념, 관찰 포인트, 짧은 퀴즈를 만들어 학습 범위를 넓힙니다." : "Generate extra concepts, viewer checkpoints, and short quizzes from the current lesson."}</p>
      </div>
      <button type="button" data-learning-ai="${escapeHtml(topic.id)}" ${state.learningAi.loading ? "disabled" : ""}>
        ${state.learningAi.loading ? (isKo ? "생성 중" : "Generating") : (isKo ? "AI로 넓히기" : "Expand with AI")}
      </button>
      ${state.learningAi.error ? `<p class="learning-ai-error">${escapeHtml(state.learningAi.error)}</p>` : ""}
      ${state.learningAi.content ? `<pre>${escapeHtml(state.learningAi.content)}</pre>` : ""}
    </section>
  `;
}

function getKoreanGlossaryTerms() {
  return [
    ["DNA", "유전 정보를 담고 있는 긴 분자입니다.", "DNA에는 단백질을 만드는 설계 정보가 들어 있습니다. 단백질은 DNA 서열을 읽거나 자르거나 복제하는 과정에 자주 관여합니다."],
    ["RNA", "DNA 정보를 옮기거나 조절하는 분자입니다.", "RNA는 단백질 합성의 중간 전달자 역할을 하기도 하고, Cas9처럼 단백질을 표적 위치로 안내하는 가이드 역할을 하기도 합니다."],
    ["단백질", "아미노산이 길게 연결되어 접힌 분자입니다.", "세포 안에서 구조 유지, 반응 촉진, 신호 전달, 물질 운반 같은 일을 합니다. 구조가 달라지면 기능도 달라질 수 있습니다."],
    ["기능", "분자가 실제로 하는 일입니다.", "단백질 기능은 산소 운반, DNA 결합, 반응 촉진, 신호 전달처럼 다양합니다. 구조를 보면 그 기능이 어떻게 가능한지 추측할 수 있습니다."],
    ["아미노산", "단백질을 만드는 작은 부품입니다.", "20종류가 있고 전하, 크기, 물을 좋아하는 정도가 다릅니다. 이 차이가 단백질 접힘과 결합 부위를 만듭니다."],
    ["잔기", "단백질 사슬 안의 아미노산 하나입니다.", "예를 들어 ALA 41은 41번 위치의 알라닌 잔기를 뜻합니다. 뷰어에서 클릭하는 단위가 보통 잔기입니다."],
    ["접힘", "단백질 사슬이 3D 모양으로 접히는 과정입니다.", "단백질은 실처럼 길게만 있지 않고 특정 모양으로 접힙니다. 이 모양이 결합 부위와 기능을 결정합니다."],
    ["도메인", "단백질 안의 비교적 독립적인 구조 단위입니다.", "큰 단백질은 여러 도메인으로 나뉘기도 합니다. 각 도메인은 DNA 결합, 효소 반응, 다른 단백질 결합 같은 역할을 맡을 수 있습니다."],
    ["리간드", "단백질에 붙는 작은 분자입니다.", "약물, 금속 이온, 기질, 생성물 등이 리간드가 될 수 있습니다. 리간드가 붙으면 단백질 구조나 기능이 바뀔 수 있습니다."],
    ["효소", "화학 반응을 빠르게 해주는 단백질입니다.", "효소는 활성 부위에서 기질을 붙잡고 반응을 돕습니다. 작은 구조 변화도 효소 활성에 큰 영향을 줄 수 있습니다."],
    ["기질", "효소가 반응시키는 대상 분자입니다.", "효소는 특정 기질을 알아보고 결합합니다. 구조에서는 기질이 들어갈 수 있는 홈이나 포켓을 확인할 수 있습니다."],
    ["활성 부위", "효소 반응이 일어나는 자리입니다.", "활성 부위 주변 아미노산들은 기질을 붙잡거나 화학 반응을 직접 돕습니다. 원자 배치가 매우 중요합니다."],
    ["결합 부위", "단백질이 다른 분자와 만나는 위치입니다.", "DNA, RNA, 단백질, 약물, 금속 이온 등이 결합할 수 있습니다. 표면의 홈이나 전하 분포가 단서가 됩니다."],
    ["체인", "구조 파일 안의 단백질 사슬 하나입니다.", "하나의 PDB 구조에는 A, B, C처럼 여러 체인이 있을 수 있습니다. 여러 체인이 모여 복합체를 만들기도 합니다."],
    ["복합체", "여러 분자가 모여 기능하는 구조입니다.", "단백질-단백질, 단백질-DNA, 단백질-RNA 복합체가 있습니다. 실제 기능은 단독 단백질보다 복합체에서 더 잘 보일 때가 많습니다."],
    ["변이", "서열 일부가 바뀐 상태입니다.", "아미노산 하나가 바뀌어도 접힘, 안정성, 결합, 기능이 달라질 수 있습니다. 다만 이 앱의 변이 설명은 교육용 해석입니다."],
    ["해상도", "실험 구조가 얼마나 세밀한지 나타내는 값입니다.", "보통 Å 단위로 표시합니다. 숫자가 작을수록 원자 위치를 더 자세히 볼 수 있지만, 모든 해석은 구조 품질과 함께 봐야 합니다."],
    ["B-factor", "실험 구조에서 원자 위치의 흔들림/불확실성을 나타냅니다.", "값이 높으면 유연하거나 덜 고정된 영역일 수 있습니다. 단독으로 나쁘다는 뜻은 아니고 움직임의 단서로 봅니다."],
    ["pLDDT", "AlphaFold 예측 구조의 잔기별 신뢰도 점수입니다.", "점수가 높으면 그 부위의 국소 구조 예측을 더 신뢰할 수 있습니다. 낮은 영역은 유연하거나 예측이 어려운 부위일 수 있습니다."],
    ["PDB", "실험으로 밝혀진 3D 구조 데이터베이스입니다.", "X-ray, NMR, Cryo-EM 같은 실험으로 얻은 구조가 들어 있습니다. 결합 분자나 복합체 상태를 볼 때 특히 중요합니다."],
    ["AlphaFold", "AI로 예측한 단백질 구조 데이터베이스입니다.", "서열만으로 전체 접힘을 빠르게 볼 수 있습니다. 하지만 결합 상태, 복합체, 리간드는 별도 근거가 필요할 수 있습니다."]
  ];
}

function getEnglishGlossaryTerms() {
  return [
    ["DNA", "A long molecule that stores genetic information.", "DNA contains instructions for making proteins. Many proteins read, bind, cut, copy, or repair DNA."],
    ["RNA", "A molecule that carries or regulates genetic information.", "RNA can deliver instructions for protein synthesis or guide proteins such as Cas9 to a target sequence."],
    ["Protein", "A folded molecule made from amino acids.", "Proteins support structure, signaling, transport, and chemical reactions. Their shape strongly affects their function."],
    ["Function", "What a molecule does in a biological system.", "Protein functions include oxygen transport, DNA binding, catalysis, signaling, and molecular recognition."],
    ["Amino acid", "A small building block of proteins.", "Amino acids differ in charge, size, shape, and water preference. These differences drive folding and binding."],
    ["Residue", "One amino acid inside a protein chain.", "For example, ALA 41 means alanine at position 41. Viewer clicks often identify residues."],
    ["Fold", "The 3D shape of a protein chain.", "A protein is not just a string. It folds into a shape that creates surfaces, pockets, and interaction sites."],
    ["Domain", "A semi-independent structural unit in a protein.", "Large proteins often contain multiple domains, each with a specific job such as DNA binding or catalysis."],
    ["Ligand", "A molecule bound to a protein.", "Ligands can be drugs, metal ions, substrates, or products. Binding can change protein structure or activity."],
    ["Enzyme", "A protein that speeds up a chemical reaction.", "Enzymes hold substrates in active sites and position atoms so reactions can happen faster."],
    ["Substrate", "The molecule an enzyme acts on.", "A substrate fits into a binding pocket or active site before being converted into product."],
    ["Active site", "The location where an enzyme reaction occurs.", "Active-site residues bind the substrate and directly help the chemical reaction."],
    ["Binding site", "A location where another molecule contacts a protein.", "DNA, RNA, proteins, drugs, or metal ions can bind here. Shape and charge are important clues."],
    ["Chain", "One protein strand in a structure file.", "PDB structures may contain chain A, B, C, and so on. Multiple chains can form an assembly."],
    ["Complex", "A structure made from multiple molecules.", "Protein-protein, protein-DNA, and protein-RNA complexes often show how function happens in real cells."],
    ["Mutation", "A change in sequence.", "A single amino-acid change can affect folding, stability, binding, or function. In this app, mutation interpretation is educational."],
    ["Resolution", "A measure of detail in an experimental structure.", "Usually shown in angstroms. Smaller values often support finer atomic interpretation."],
    ["B-factor", "A measure related to atomic motion or uncertainty in PDB structures.", "Higher values can indicate flexible or less ordered regions. It is a clue, not automatically a flaw."],
    ["pLDDT", "AlphaFold's residue-level confidence score.", "Higher scores mean the local predicted structure is more reliable. Low scores may indicate flexible or uncertain regions."],
    ["PDB", "A database of experimentally determined 3D structures.", "PDB entries come from methods such as X-ray crystallography, NMR, and Cryo-EM."],
    ["AlphaFold", "An AI database of predicted protein structures.", "It is useful for seeing likely folds, but bound states, complexes, and ligands may require separate evidence."]
  ];
}

function getLearningTopics() {
  if (state.language === "en") return getEnglishLearningTopics();
  return [
    {
      id: "start",
      tab: "시작하기",
      orderLabel: "0.",
      icon: "book",
      type: "glossary",
      title: "용어 정리",
      intro:
        "단백질 구조를 처음 보는 사람도 따라올 수 있도록 자주 나오는 말을 짧게 풀었습니다."
    },
    {
      id: "amino",
      tab: "아미노산과 단백질",
      icon: "network",
      title: "아미노산과 단백질",
      intro:
        "20가지 아미노산의 <strong>전하, 극성, 소수성</strong> 차이가 단백질 접힘과 결합 부위를 어떻게 만드는지 배웁니다. 각 아미노산의 화학적 성질이 3D 구조와 기능을 결정합니다.",
      cards: [
        lessonCard("소수성 (Hydrophobic)", "droplet", "amber", "물을 피하고 단백질 내부 코어를 형성합니다.", ["Ala (A)", "Val (V)", "Leu (L)", "Ile (I)", "Met (M)", "Phe (F)", "Trp (W)", "Pro (P)"], ["소수성 코어 형성", "막 단백질 구조", "리간드 결합 포켓"]),
        lessonCard("극성 (Polar)", "zap", "green", "수소결합을 형성하고 활성 부위에서 중요한 역할을 합니다.", ["Ser (S)", "Thr (T)", "Cys (C)", "Asn (N)", "Gln (Q)", "Tyr (Y)"], ["수소결합 네트워크", "효소 촉매", "기질 인식"]),
        lessonCard("양전하 (Positive)", "zap", "blue", "DNA/RNA 결합과 염다리를 형성합니다.", ["Lys (K)", "Arg (R)", "His (H)"], ["DNA 결합", "염다리", "핵산 인식"]),
        lessonCard("음전하 (Negative)", "zap", "red", "금속 이온 결합과 pH 의존적 기능을 수행합니다.", ["Asp (D)", "Glu (E)"], ["금속 이온 결합", "pH 센서", "촉매 잔기"]),
        lessonCard("방향족 (Aromatic)", "hexagon", "violet", "π-π 상호작용과 소수성 상호작용을 합니다.", ["Phe (F)", "Tyr (Y)", "Trp (W)"], ["방향족 상호작용", "DNA 염기 적층", "단백질 안정화"]),
        lessonCard("특수 (Special)", "link", "slate", "Gly는 유연성, Cys는 이황화 결합, Pro는 꺾임을 만듭니다.", ["Gly (G)", "Cys (C)", "Pro (P)"], ["이황화 결합", "구조적 꺾임", "루프 영역"])
      ],
      conceptPanel: conceptPanel("핵심 개념", "blue", "droplet", [
        ["소수성 코어", "소수성 아미노산이 단백질 내부로 모여 안정적인 코어를 형성합니다."],
        ["전하와 염다리", "양전하와 음전하 아미노산이 만나 염다리를 형성하고 구조를 안정화합니다."],
        ["수소결합", "극성 아미노산이 수소결합 네트워크를 만들어 효소 활성과 기질 인식에 기여합니다."],
        ["방향족 상호작용", "방향족 고리들이 π-π 상호작용을 하며 DNA 염기와도 상호작용합니다."]
      ])
    },
    {
      id: "structure",
      tab: "단백질 구조",
      icon: "layers",
      title: "단백질 구조 단계",
      intro:
        "1차 구조부터 4차 구조까지 연결해서 보고, 실제 3D 구조에서 <strong>알파 나선과 베타 가닥</strong>을 찾습니다. 각 단계가 어떻게 쌓여서 최종 기능을 만드는지 이해합니다.",
      cards: [
        lessonCard("1차 구조", "arrow", "red", "아미노산의 선형 서열입니다. 유전 정보가 직접 코딩하는 유일한 구조 단계입니다.", ["Primary Structure"], ["서열 정보", "변이 위치", "도메인 경계"]),
        lessonCard("2차 구조", "grid", "blue", "주쇄 수소결합으로 생기는 알파 나선과 베타 가닥입니다.", ["α-helix", "β-sheet", "turns", "loops"], ["규칙적 접힘", "수소결합", "구조 모티프"]),
        lessonCard("3차 구조", "box", "violet", "측쇄 간 상호작용으로 만들어지는 전체 3D 접힘입니다.", ["Tertiary Structure"], ["도메인 구조", "활성 부위", "결합 포켓"]),
        lessonCard("4차 구조", "layers", "green", "여러 서브유닛이 모여 기능적 복합체를 형성합니다.", ["Quaternary Structure"], ["헤모글로빈", "DNA 중합효소", "항체"])
      ],
      featurePanel: featurePanel("2차 구조 모티프", "blue", "grid", [
        ["α-helix (알파 나선)", "오른쪽 나선 구조로 3.6개 잔기당 한 바퀴 회전합니다.", "수소결합: i → i+4", "막 관통 영역", "DNA 결합 모티프"],
        ["β-sheet (베타 시트)", "펼쳐진 사슬들이 나란히 배열되어 판 모양을 만듭니다.", "평행/역평행", "강한 구조", "섬유상 단백질"],
        ["β-turn", "4개 잔기로 방향을 180도 바꾸는 구조입니다.", "루프 연결", "표면 위치", "Gly, Pro 선호"],
        ["Loop/Coil", "규칙적이지 않은 연결 영역입니다.", "유연성", "결합 부위", "진화적 가변성"]
      ]),
      conceptPanel: conceptPanel("도메인과 복합체", "blue", "box", [
        ["도메인", "독립적으로 접히는 구조 단위입니다. 진화적으로 보존되며 기능 모듈을 형성합니다."],
        ["복합체", "여러 서브유닛이 모여 기능을 수행합니다. 협동적 결합과 알로스테릭 조절이 가능합니다."],
        ["접힘 원리", "소수성 코어가 중심에, 친수성 잔기가 표면에 배치되어 안정한 구조를 만듭니다."]
      ])
    },
    {
      id: "enzyme",
      tab: "효소와 결합",
      icon: "activity",
      title: "효소와 결합",
      intro:
        "<strong>활성 부위, 기질 결합, 보조인자, 저해제</strong>가 구조에서 어떤 모양으로 보이는지 학습합니다. 3D 구조가 촉매 메커니즘을 어떻게 결정하는지 이해합니다.",
      cards: [
        lessonCard("활성 부위 (Active Site)", "activity", "blue", "기질이 결합하고 반응이 일어나는 3D 포켓입니다.", [], ["촉매 잔기: 화학 반응을 직접 수행", "결합 잔기: 기질을 인식하고 고정", "정확한 기하학: Å 단위 정밀도", "소수성/극성 배치: 기질 특이성"], ["Ser-His-Asp 촉매 삼각", "Zn²⁺ 결합 부위", "옥시아니온 홀"]),
        lessonCard("리간드 결합", "lock", "violet", "기질, 생성물, 저해제가 결합하는 방식입니다.", [], ["Lock-and-Key: 정확한 형태 일치", "Induced Fit: 결합 시 구조 변화", "수소결합 네트워크", "소수성 상호작용"], ["기질 특이성", "경쟁적 저해", "알로스테릭 조절"]),
        lessonCard("보조인자 (Cofactor)", "sparkles", "amber", "효소 활성에 필요한 비단백질 분자입니다.", [], ["금속 이온: Fe²⁺, Zn²⁺, Mg²⁺, Cu²⁺", "보조효소: NAD⁺, FAD, ATP", "헴 그룹: 산소 운반과 전자 전달", "조효소: 비타민 유도체"], ["헴 그룹", "NAD⁺ 결합", "Mg²⁺-ATP 복합체"]),
        lessonCard("저해제 (Inhibitor)", "circle", "red", "효소 활성을 막는 분자들입니다.", [], ["경쟁적: 활성 부위에 결합", "비경쟁적: 다른 부위에 결합", "비가역적: 공유 결합 형성", "약물 설계: 질병 치료"], ["페니실린", "스타틴", "프로테아제 저해제"])
      ],
      featurePanel: featurePanel("촉매 메커니즘 예시", "blue", "activity", [
        ["세린 프로테아제", "Ser이 친핵체로 작용하여 펩타이드 결합을 가수분해합니다.", "Ser-His-Asp 촉매 삼각", "Trypsin, Chymotrypsin"],
        ["라이소자임", "Glu와 Asp가 글리코시드 결합 전이 상태를 안정화합니다.", "이온 안정화", "Lysozyme"],
        ["카르복시펩티다제", "Zn²⁺ 이온이 물 분자를 활성화하고 펩타이드를 절단합니다.", "금속 활성화", "Carboxypeptidase A"],
        ["RNase A", "His12와 His119가 RNA 인산 결합을 절단합니다.", "산-염기 촉매", "Ribonuclease A"]
      ]),
      conceptPanel: conceptPanel("구조-기능 관계", "orange", "activity", [
        ["정밀한 배치", "촉매 잔기가 Å 단위로 정확하게 배치되어 전이 상태를 안정화합니다. 하나의 아미노산 변이도 활성을 크게 바꿀 수 있습니다."],
        ["유도 적합", "기질이 결합하면 효소가 구조를 바꿔 최적 반응 기하학을 만듭니다. 동적 구조 변화가 촉매에 필수적입니다."],
        ["금속 이온 역할", "금속 이온이 전자를 끌어당기거나 물을 활성화하여 반응을 가속합니다."],
        ["저해제 설계", "활성 부위 구조를 기반으로 약물을 설계합니다. 수소결합과 소수성 상호작용을 최적화합니다."]
      ])
    },
    {
      id: "nucleic",
      tab: "DNA/RNA와 단백질",
      icon: "dna",
      title: "DNA/RNA와 단백질",
      intro:
        "<strong>양전하 잔기와 핵산 골격의 상호작용</strong>, 전사인자와 Cas9 같은 단백질의 인식 원리를 배웁니다. 단백질이 어떻게 DNA/RNA를 찾고 결합하는지 구조적으로 이해합니다.",
      cards: [
        lessonCard("인산 골격 결합", "zap", "blue", "DNA/RNA의 음전하 인산 골격과 양전하 아미노산이 정전기적으로 결합합니다.", ["Lys (K)", "Arg (R)", "His (H)"], ["양전하 측쇄가 인산기를 중화", "염다리 형성으로 결합 안정화", "서열 비특이적 결합", "DNA 감기 및 압축"], ["히스톤", "DNA 중합효소", "RNA 결합 단백질"]),
        lessonCard("염기 인식", "target", "violet", "특정 DNA 서열을 인식하기 위해 염기와 직접 상호작용합니다.", ["수소결합 공여체/수용체", "방향족 잔기"], ["주요 홈/부 홈 인식", "염기별 수소결합 패턴", "서열 특이적 결합", "방향족 적층 상호작용"], ["전사인자", "Zinc finger", "Helix-turn-helix"]),
        lessonCard("가이드 RNA", "link", "green", "RNA가 단백질과 복합체를 형성하여 표적 DNA를 인식합니다.", ["RNA 결합 도메인", "PAM 인식 잔기"], ["RNA-DNA 이중가닥 형성", "단백질의 RNA 골격 결합", "PAM 서열 인식", "표적 특이성 제공"], ["CRISPR-Cas9", "Argonaute", "RISC 복합체"]),
        lessonCard("결합 특이성", "dna", "amber", "단백질이 수백만 개 서열 중에서 특정 표적만 찾아내는 메커니즘입니다.", ["복합 인식 모티프"], ["직접 염기 판독", "간접 형태 인식", "협동적 결합", "슬라이딩과 hopping"], ["lac repressor", "p53", "TATA box binding"])
      ],
      featurePanel: featurePanel("주요 단백질-핵산 복합체", "blue", "dna", [
        ["CRISPR-Cas9", "RNA 가이드를 사용하여 표적 DNA를 절단하는 유전자 편집 도구입니다.", "gRNA가 표적 서열 지정", "PAM 서열 인식", "RuvC/HNH 도메인"],
        ["전사인자", "DNA 서열을 인식하여 유전자 발현을 조절하는 단백질입니다.", "DNA 결합 도메인", "주요 홈 인식", "이량체 형성"],
        ["히스톤", "DNA를 감고 압축하는 염기성 단백질입니다.", "Lys/Arg 풍부", "8량체 코어", "DNA 147bp 감기"]
      ]),
      conceptPanel: conceptPanel("DNA 인식 메커니즘", "purple", "target", [
        ["직접 염기 판독", "아미노산 측쇄가 주요 홈으로 들어가 염기와 수소결합을 형성합니다."],
        ["간접 형태 인식", "DNA 서열에 따라 나선 폭, 굽힘, 유연성이 달라지고 단백질이 이를 인식합니다."],
        ["RNA 매개 표적화", "가이드 RNA가 Watson-Crick 염기쌍으로 표적을 지정합니다."],
        ["1차원 확산", "단백질이 DNA를 따라 sliding과 hopping을 하며 표적 서열을 빠르게 찾습니다."]
      ])
    },
    {
      id: "mutation",
      tab: "변이와 질병",
      icon: "alert",
      title: "변이와 질병",
      intro:
        "아미노산 하나가 바뀌면 <strong>전하, 크기, 접힘, 결합 위치</strong>가 어떻게 달라지는지 구조 위에서 해석합니다. 단일 변이가 질병을 유발하는 메커니즘을 분자 수준에서 이해합니다.",
      cards: [
        lessonCard("Missense 변이", "alert", "amber", "하나의 아미노산이 다른 아미노산으로 치환됩니다.", ["Val → Ile: 보존적", "Glu → Val: 비보존적"], ["보존적 변이는 구조와 기능이 대부분 유지될 수 있음", "비보존적 변이는 구조 파괴와 기능 상실 가능"], ["겸상 적혈구: HbS Glu6Val", "p53 변이: 암 발생"]),
        lessonCard("표면 전하 변화", "zap", "blue", "전하를 띤 잔기가 바뀌면 단백질 표면 특성이 달라집니다.", ["Lys → Glu", "Arg → Cys"], ["단백질-단백질 상호작용 변화", "용해도 변화", "DNA/RNA 결합 능력 변화", "pH 의존성 변화"]),
        lessonCard("코어 불안정화", "box", "red", "소수성 코어 내부의 변이는 접힘을 방해합니다.", ["Pro → Leu", "Gly → Val"], ["단백질 언폴딩", "응집체 형성", "프로테아좀 분해", "낮은 발현량"]),
        lessonCard("기능 변화", "target", "violet", "활성 부위나 결합 부위의 변이는 직접 기능에 영향을 줍니다.", ["Ser → Ala", "Arg → His"], ["효소 활성 감소/증가", "기질 특이성 변화", "저해제 저항성", "알로스테릭 조절 변화"])
      ],
      featurePanel: featurePanel("질병 관련 변이 예시", "red", "alert", [
        ["겸상 적혈구 빈혈", "Hb β-chain Glu6Val. 소수성 Val이 표면에 노출되어 헤모글로빈이 중합되고 적혈구가 변형됩니다.", "표면 전하 → 소수성 변화", "2HBS"],
        ["낭포성 섬유증", "CFTR ΔPhe508. 508번 Phe 결실로 단백질이 잘못 접히고 ER에서 분해됩니다.", "코어 불안정화", "2PZE"],
        ["암 (p53 변이)", "p53 Arg248Gln, Arg273His. DNA 결합 도메인의 양전하 잔기가 바뀌어 DNA 인식이 어려워집니다.", "DNA 결합 부위 전하 손실", "1TUP"],
        ["가족성 알츠하이머", "APP, Presenilin 변이로 아밀로이드 베타 절단 패턴이 바뀌어 응집성 펩타이드가 증가합니다.", "기질 인식/절단 위치 변화", "1IYT"]
      ]),
      conceptPanel: conceptPanel("변이 해석 체크리스트", "orange", "alert", [
        ["1. 위치 확인", "표면 vs 내부, 활성 부위/결합 부위, 2차 구조 영역, 도메인 경계를 확인합니다."],
        ["2. 화학적 성질", "전하, 크기, 극성 변화와 Cys/Pro/Gly 같은 특수 기능을 봅니다."],
        ["3. 구조 영향", "소수성 코어 파괴, 수소결합 손실, 염다리 손실, 공간 충돌을 확인합니다."],
        ["4. 기능 영향", "촉매 활성, 기질 결합, DNA/단백질 상호작용, 안정성/발현량 변화를 연결합니다."]
      ])
    },
    {
      id: "data",
      tab: "구조 데이터 읽기",
      icon: "database",
      title: "구조 데이터 읽기",
      intro:
        "<strong>PDB, AlphaFold, 해상도, B-factor, pLDDT</strong>를 구분하고 어떤 결론까지 말할 수 있는지 배웁니다. 구조 데이터의 품질을 평가하고 올바르게 해석하는 방법을 이해합니다.",
      cards: [
        lessonCard("PDB (Protein Data Bank)", "database", "blue", "실험적으로 결정된 3D 구조 데이터베이스입니다.", ["X-ray 결정학", "NMR 분광학", "Cryo-EM"], ["실제 실험 데이터", "리간드 결합 구조", "복합체 구조", "동적 상태 포착 가능"], ["해상도와 R-factor 확인", "B-factor로 유연성 확인"]),
        lessonCard("AlphaFold", "sparkles", "violet", "AI로 예측한 단백질 구조 데이터베이스입니다.", ["딥러닝 예측", "서열 정보 기반"], ["거의 모든 단백질", "빠른 예측", "무료 접근", "전체 프로테옴 커버"], ["pLDDT 색상 확인", "PAE로 도메인 구분"])
      ],
      featurePanel: featurePanel("품질 지표 해석", "blue", "chart", [
        ["해상도 (Resolution)", "X-ray/Cryo-EM 구조의 세밀함을 나타냅니다.", "< 2.0 Å: 매우 높음", "2.0-3.0 Å: 높음", "> 4.0 Å: 전체 모양 중심"],
        ["R-factor / R-free", "실험 데이터와 모델의 일치도입니다.", "R-factor < 0.20: 좋은 모델", "R-free < 0.25: 좋은 모델", "차이가 작을수록 과적합 적음"],
        ["B-factor", "각 원자의 열적 움직임/무질서도입니다.", "낮음: 고정된 구조", "높음: 유연한 루프", "활성 부위는 보통 낮음"],
        ["pLDDT", "AlphaFold 예측의 신뢰도 점수입니다.", "> 90: 매우 높은 신뢰도", "70-90: 높은 신뢰도", "< 50: 매우 낮은 신뢰도"]
      ]),
      conceptPanel: conceptPanel("구조 해석 가이드라인", "blue", "eye", [
        ["구조가 신뢰할 만한가?", "PDB는 Resolution < 3.0 Å, R-free < 0.25를 확인하고 AlphaFold는 pLDDT > 70 영역을 우선 봅니다."],
        ["활성 부위를 믿을 수 있는가?", "리간드 결합과 촉매 해석은 가능하면 PDB 실험 구조를 우선 사용합니다."],
        ["루프/표면 영역은?", "B-factor가 높거나 pLDDT가 낮을 수 있어 하나의 구조로 단정하지 않습니다."],
        ["여러 구조 비교", "같은 단백질의 다양한 구조를 비교해 보존된 영역과 유연한 영역을 구분합니다."]
      ])
    }
  ];
}

function lessonCard(title, icon, tone, description, chips = [], features = [], examples = []) {
  return { title, icon, tone, description, chips, features, examples };
}

function getEnglishLearningTopics() {
  return [
    {
      id: "start",
      tab: "Start Here",
      orderLabel: "0.",
      icon: "book",
      type: "glossary",
      title: "Glossary",
      intro:
        "Short definitions for words that appear often in protein structure lessons."
    },
    {
      id: "amino",
      tab: "Amino Acids",
      icon: "network",
      title: "Amino Acids and Proteins",
      intro:
        "Learn how <strong>charge, polarity, and hydrophobicity</strong> shape protein folding and binding sites. Amino-acid chemistry is the bridge between sequence, 3D structure, and function.",
      cards: [
        lessonCard("Hydrophobic", "droplet", "amber", "These residues avoid water and often form the buried core of a protein.", ["Ala", "Val", "Leu", "Ile", "Met", "Phe", "Trp", "Pro"], ["Hydrophobic core", "Membrane proteins", "Ligand pockets"]),
        lessonCard("Polar", "zap", "green", "Polar residues form hydrogen bonds and frequently participate in recognition or catalysis.", ["Ser", "Thr", "Cys", "Asn", "Gln", "Tyr"], ["Hydrogen-bond networks", "Active sites", "Substrate recognition"]),
        lessonCard("Positive", "zap", "blue", "Basic residues interact strongly with negatively charged DNA, RNA, and acidic protein surfaces.", ["Lys", "Arg", "His"], ["DNA binding", "Salt bridges", "Nucleic-acid recognition"]),
        lessonCard("Negative", "zap", "red", "Acidic residues often bind metal ions, tune pH-sensitive behavior, and stabilize catalytic states.", ["Asp", "Glu"], ["Metal binding", "pH sensing", "Catalytic residues"]),
        lessonCard("Aromatic", "hexagon", "violet", "Aromatic rings support stacking interactions and can stabilize hydrophobic pockets.", ["Phe", "Tyr", "Trp"], ["Pi stacking", "DNA base stacking", "Protein stability"]),
        lessonCard("Special", "link", "slate", "Gly adds flexibility, Cys can form disulfide bonds, and Pro creates structural bends.", ["Gly", "Cys", "Pro"], ["Disulfide bonds", "Turns", "Loop regions"])
      ],
      conceptPanel: conceptPanel("Core Concepts", "blue", "droplet", [
        ["Hydrophobic core", "Nonpolar residues cluster inside the protein to reduce contact with water."],
        ["Salt bridges", "Opposite charges can pair and stabilize a folded structure or interface."],
        ["Hydrogen bonds", "Polar residues create specific contacts used in folding, binding, and catalysis."],
        ["Aromatic interactions", "Flat ring systems can stack with other rings, including DNA bases."]
      ])
    },
    {
      id: "structure",
      tab: "Protein Structure",
      icon: "layers",
      title: "Levels of Protein Structure",
      intro:
        "Connect primary sequence to secondary motifs, tertiary folding, and quaternary assemblies. The goal is to read what a 3D structure is telling you.",
      cards: [
        lessonCard("Primary Structure", "arrow", "red", "The linear amino-acid sequence encoded by genetic information.", ["Sequence"], ["Mutation positions", "Domain boundaries", "Conserved motifs"]),
        lessonCard("Secondary Structure", "grid", "blue", "Local backbone patterns such as alpha helices, beta sheets, turns, and loops.", ["Alpha helix", "Beta sheet", "Loop"], ["Backbone hydrogen bonds", "Motifs"]),
        lessonCard("Tertiary Structure", "box", "violet", "The full 3D fold created by side-chain interactions and domain packing.", ["Fold"], ["Active sites", "Binding pockets", "Domains"]),
        lessonCard("Quaternary Structure", "layers", "green", "Multiple protein chains assembled into a functional complex.", ["Assembly"], ["Hemoglobin", "Antibodies", "Polymerases"])
      ],
      featurePanel: featurePanel("Secondary Motifs", "blue", "grid", [
        ["Alpha helix", "A compact spiral often used in membrane spans and DNA-binding motifs."],
        ["Beta sheet", "Extended strands packed into stable sheets."],
        ["Turn", "A short segment that changes chain direction."],
        ["Loop", "A flexible region that often contributes to recognition."]
      ]),
      conceptPanel: conceptPanel("Domains and Folding", "blue", "box", [
        ["Domain", "A structural unit that can often fold and function semi-independently."],
        ["Complex", "A functional assembly made from multiple chains or subunits."],
        ["Folding principle", "Hydrophobic groups tend inward while polar groups tend outward."]
      ])
    },
    {
      id: "enzyme",
      tab: "Enzymes",
      icon: "activity",
      title: "Enzymes and Binding",
      intro:
        "Study active sites, ligands, cofactors, and inhibitors as structural features. Enzymes work because atoms are positioned with remarkable precision.",
      cards: [
        lessonCard("Active Site", "activity", "blue", "A 3D pocket where substrate binding and chemical reaction occur.", ["Catalytic residues", "Binding residues"], ["Ser-His-Asp triad", "Oxyanion hole"]),
        lessonCard("Ligand Binding", "lock", "violet", "Substrates, products, and inhibitors bind through shape and chemistry.", ["Induced fit", "Hydrogen bonds"], ["Specificity", "Competitive inhibition"]),
        lessonCard("Cofactor", "sparkles", "amber", "A non-protein molecule or ion required for activity.", ["Zn2+", "Mg2+", "NAD+", "FAD"], ["Metal activation", "Electron transfer"]),
        lessonCard("Inhibitor", "circle", "red", "A molecule that blocks or changes enzyme activity.", ["Competitive", "Noncompetitive"], ["Drug design", "Resistance"])
      ],
      conceptPanel: conceptPanel("Structure-Function Relationship", "red", "activity", [
        ["Precise placement", "Catalytic residues must be positioned at angstrom-scale distances."],
        ["Induced fit", "Binding can shift the enzyme into a more reactive geometry."],
        ["Metal ions", "Metals can polarize bonds, stabilize charges, or activate water."],
        ["Drug design", "Active-site structure guides inhibitor optimization."]
      ])
    },
    {
      id: "nucleic",
      tab: "DNA/RNA",
      icon: "dna",
      title: "DNA/RNA and Proteins",
      intro:
        "Learn how proteins recognize nucleic acids through charge, shape, base reading, and guide RNA systems such as CRISPR.",
      cards: [
        lessonCard("Phosphate Backbone", "zap", "blue", "Positive residues bind the negatively charged DNA/RNA backbone.", ["Lys", "Arg", "His"], ["Histones", "Polymerases"]),
        lessonCard("Base Recognition", "target", "violet", "Side chains read base-specific hydrogen-bond patterns in DNA grooves.", ["Major groove", "Minor groove"], ["Transcription factors", "Zinc fingers"]),
        lessonCard("Guide RNA", "link", "green", "RNA can guide proteins to a target nucleic-acid sequence.", ["gRNA", "PAM"], ["Cas9", "Argonaute"]),
        lessonCard("Specificity", "dna", "amber", "Proteins find rare target sequences using direct and indirect recognition.", ["Shape readout", "Sliding"], ["p53", "lac repressor"])
      ],
      conceptPanel: conceptPanel("Recognition Mechanisms", "purple", "dna", [
        ["Direct readout", "Amino-acid side chains contact bases directly."],
        ["Indirect readout", "A protein recognizes sequence-dependent DNA shape."],
        ["RNA-guided targeting", "Guide RNA supplies base-pairing specificity."],
        ["1D diffusion", "Proteins can slide or hop along DNA while searching."]
      ])
    },
    {
      id: "mutation",
      tab: "Mutation",
      icon: "alert",
      title: "Mutations and Disease",
      intro:
        "Interpret how one amino-acid change can alter charge, size, folding, binding, and function. This section is for education and research exploration, not diagnosis.",
      cards: [
        lessonCard("Missense", "alert", "amber", "One residue is replaced by another, sometimes preserving chemistry and sometimes disrupting it.", ["Conservative", "Nonconservative"], ["Glu to Val", "Arg to His"]),
        lessonCard("Surface Charge", "zap", "blue", "Changing surface charge can alter solubility and molecular recognition.", ["Protein interfaces", "DNA binding"], ["Lys to Glu", "Arg to Cys"]),
        lessonCard("Core Instability", "box", "red", "Buried mutations can destabilize folding or create steric clashes.", ["Hydrophobic core", "Unfolding"], ["Gly to Val", "Pro changes"]),
        lessonCard("Functional Site", "target", "violet", "Mutations near active or binding sites can directly change activity.", ["Catalysis", "Affinity"], ["Active-site Ser to Ala"])
      ],
      conceptPanel: conceptPanel("Mutation Checklist", "red", "alert", [
        ["Location", "Is it buried, exposed, in a domain, or near a binding site?"],
        ["Chemistry", "Did charge, polarity, size, or flexibility change?"],
        ["Structure", "Could it break contacts or create clashes?"],
        ["Function", "Could it affect catalysis, binding, or stability?"]
      ])
    },
    {
      id: "data",
      tab: "Data Quality",
      icon: "database",
      title: "Reading Structure Data",
      intro:
        "Compare PDB and AlphaFold data, then learn how resolution, B-factor, and pLDDT limit what you can safely conclude.",
      cards: [
        lessonCard("PDB", "database", "blue", "Experimental structures from X-ray crystallography, NMR, and cryo-EM.", ["Experimental"], ["Ligands", "Complexes", "Resolution"]),
        lessonCard("AlphaFold", "sparkles", "violet", "Predicted structures generated from sequence information.", ["Prediction"], ["pLDDT", "Proteome coverage"]),
        lessonCard("Resolution", "chart", "green", "How much detail an experimental structure can support.", ["Angstrom"], ["Side-chain confidence", "Model quality"]),
        lessonCard("B-factor / pLDDT", "eye", "amber", "Indicators of flexibility, disorder, or prediction confidence.", ["B-factor", "pLDDT"], ["Loops", "Domain confidence"])
      ],
      conceptPanel: conceptPanel("Interpretation Rules", "blue", "eye", [
        ["Use PDB first", "Prefer experimental structures for ligands, complexes, and active-site geometry."],
        ["Use AlphaFold carefully", "Predictions are excellent for hypotheses, but not all details are experimental facts."],
        ["Compare structures", "Multiple states reveal flexible regions and binding-induced changes."],
        ["Check metrics", "Quality values should shape how strongly you interpret a structure."]
      ])
    }
  ];
}

function featurePanel(title, tone, icon, rows) {
  return { title, tone, icon, rows };
}

function conceptPanel(title, tone, icon, rows) {
  return { title, tone, icon, rows };
}

function renderLessonCard(card) {
  return `
    <article class="lesson-card">
      <div class="lesson-card-head ${card.tone}">
        <div class="lesson-icon" aria-hidden="true">${renderLearningIcon(card.icon)}</div>
        <h3>${escapeHtml(card.title)}</h3>
      </div>
      <div class="lesson-card-body">
        ${card.chips?.length ? `<div class="lesson-chip-row">${card.chips.map((chip) => `<em>${escapeHtml(chip)}</em>`).join("")}</div>` : ""}
        <p>${escapeHtml(card.description)}</p>
        ${card.features?.length ? `<div class="lesson-feature-list">${card.features.map((feature) => `<div><span>•</span>${escapeHtml(feature)}</div>`).join("")}</div>` : ""}
        ${card.examples?.length ? `<div class="lesson-examples"><p>예시:</p><div>${card.examples.map((example) => `<em>${escapeHtml(example)}</em>`).join("")}</div></div>` : ""}
      </div>
    </article>
  `;
}

function renderFeaturePanel(panel) {
  return `
    <section class="lesson-panel ${panel.tone}">
      <h3>${renderLearningIcon(panel.icon)} ${escapeHtml(panel.title)}</h3>
      <div class="lesson-panel-grid">
        ${panel.rows
          .map(
            ([title, description, ...items]) => `
              <article>
                <h4>${escapeHtml(title)}</h4>
                <p>${escapeHtml(description)}</p>
                ${items.length ? `<div>${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderConceptPanel(panel) {
  return `
    <section class="lesson-concept ${panel.tone}">
      <h3>${renderLearningIcon(panel.icon)} ${escapeHtml(panel.title)}</h3>
      <div class="lesson-concept-grid">
        ${panel.rows
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
  `;
}

function renderLearningIcon(name) {
  const icons = {
    activity: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 8-6-16-3 8H2"/></svg>',
    alert: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>',
    box: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
    chart: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-7"/></svg>',
    circle: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/></svg>',
    database: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>',
    dna: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3c6 3 6 15 12 18"/><path d="M18 3C12 6 12 18 6 21"/><path d="M8 7h8"/><path d="M9 12h6"/><path d="M8 17h8"/></svg>',
    droplet: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3s6 6.3 6 11a6 6 0 0 1-12 0c0-4.7 6-11 6-11Z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    grid: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
    hexagon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8l-9-5-9 5v8l9 5 9-5Z"/></svg>',
    layers: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>',
    link: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1"/></svg>',
    lock: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    network: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="m8 7 3 8"/><path d="m16 7-3 8"/><path d="M8 6h8"/></svg>',
    sparkles: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9Z"/></svg>',
    target: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/></svg>',
    zap: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 3 14h8l-1 8 11-13h-8l1-7Z"/></svg>'
  };
  return icons[name] || icons.circle;
}

function renderWorkspaceSidebar() {
  const currentProject = fixedProjects.find((project) => project.id === state.currentProjectId) || fixedProjects[0];
  const notes = state.notes.filter((note) => (note.projectId || DEFAULT_PROJECT_ID) === currentProject.id);

  return `
    <aside class="workspace-sidebar ${state.isSidebarOpen ? "open" : ""}" aria-label="구조 노트">
      <div class="workspace-head">
        <button class="sidebar-close" type="button" data-sidebar-close aria-label="워크스페이스 닫기">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>
        </button>
      </div>
      <div class="workspace-section">
        <div class="workspace-folder-list">
          ${fixedProjects
            .map(
              (project) => `
                <button class="${project.id === state.currentProjectId ? "active" : ""}" type="button" data-project-id="${escapeHtml(project.id)}" data-project-rename="${escapeHtml(project.id)}" title="두 번 터치, 길게 누르기, 우클릭으로 이름 변경">
                  <span class="folder-icon" aria-hidden="true">${renderFolderIcon(project.icon)}</span>
                  <strong>${escapeHtml(getProjectName(project))}</strong>
                  <span>${state.notes.filter((note) => (note.projectId || DEFAULT_PROJECT_ID) === project.id).length}개 노트</span>
                </button>
              `
            )
            .join("")}
        </div>
      </div>

      <div class="workspace-section">
        <div class="workspace-section-head">
        <h3>${escapeHtml(getProjectName(currentProject))}</h3>
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

function renderFolderIcon(icon) {
  const map = {
    folder: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>',
    activity: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 8-6-16-3 8H2"/></svg>',
    report: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6"/><path d="M10 17h4"/></svg>',
    book: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16"/></svg>'
  };
  return map[icon] || map.folder;
}

function loadProjectNames() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PROJECT_NAME_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getProjectName(project) {
  return state.projectNames[project.id] || project.name;
}

function renameProject(projectId) {
  const project = fixedProjects.find((item) => item.id === projectId);
  if (!project) return;
  const currentName = getProjectName(project);
  const nextName = window.prompt("노트 이름을 입력하세요.", currentName);
  if (nextName === null) return;
  const trimmed = nextName.trim().slice(0, 24);
  if (!trimmed) return;
  state.projectNames = {
    ...state.projectNames,
    [projectId]: trimmed
  };
  window.localStorage.setItem(PROJECT_NAME_KEY, JSON.stringify(state.projectNames));
  render();
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
              <div class="recent-item">
                <button type="button" data-recent-query="${escapeHtml(protein.structureId || protein.englishName || protein.name)}">
                  <strong>${escapeHtml(protein.name)}</strong>
                  <span>${escapeHtml(protein.structureId)} · ${escapeHtml(protein.source)}</span>
                </button>
                <button class="recent-remove" type="button" data-recent-delete="${escapeHtml(protein.id)}" aria-label="${escapeHtml(protein.name)} 삭제">×</button>
              </div>
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

function renderStructureGuide(protein) {
  const guide = buildStructureGuide(protein);
  return `
    <section class="structure-guide" data-structure-guide>
      <div class="guide-head">
        <span>${escapeHtml(guide.kicker)}</span>
        <h3>${escapeHtml(guide.title)}</h3>
        <p>${escapeHtml(guide.summary)}</p>
      </div>
      <div class="guide-grid">
        <article>
          <strong>${escapeHtml(guide.chainLabel)}</strong>
          <p>${escapeHtml(guide.chain)}</p>
        </article>
        <article>
          <strong>${escapeHtml(guide.siteLabel)}</strong>
          <p>${escapeHtml(guide.site)}</p>
        </article>
      </div>
      <div class="first-look">
        <strong>${escapeHtml(guide.firstLookLabel)}</strong>
        <ol>
          ${guide.firstLook.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ol>
      </div>
      <div class="structure-story">
        <strong>${escapeHtml(guide.storyLabel)}</strong>
        <p>${escapeHtml(guide.story)}</p>
      </div>
    </section>
  `;
}

function buildStructureGuide(protein) {
  const isEn = state.language === "en";
  const facts = state.structureFacts[getProteinKey(protein)] || {};
  const context = getProteinContext(protein);
  const name = getDisplayName(protein);
  const factsReady = Array.isArray(facts.chains) && facts.chains.length;
  const chainText = describeChainGuide(protein, facts, context, isEn);
  const siteText = describeSiteGuide(protein, facts, context, isEn);
  const firstLook = describeFirstLook(protein, facts, context, isEn);
  const story = describeFunctionStory(protein, facts, context, isEn);

  if (isEn) {
    return {
      kicker: factsReady ? "Auto structure guide" : "Auto guide",
      title: "Read this structure in this order",
      summary: `${name} is easier to understand when you connect the whole fold, chain assembly, and binding-site region instead of reading the 3D view as a static picture.`,
      chainLabel: "Chains and subunits",
      chain: chainText,
      siteLabel: "Ligand or active site",
      site: siteText,
      firstLookLabel: "3 things to inspect first",
      firstLook,
      storyLabel: "Structure-function story",
      story
    };
  }

  return {
    kicker: factsReady ? "자동 구조 가이드" : "자동 가이드",
    title: "이 구조를 이렇게 읽어보세요",
    summary: `${name}는 전체 접힘, 체인 조립, 결합 부위를 한 번에 연결해서 보면 훨씬 이해하기 쉽습니다. 3D 그림을 그냥 보는 것이 아니라 기능을 설명하는 지도처럼 읽어보세요.`,
    chainLabel: "체인/서브유닛",
    chain: chainText,
    siteLabel: "리간드/활성 부위",
    site: siteText,
    firstLookLabel: "먼저 볼 3가지",
    firstLook,
    storyLabel: "구조와 기능을 연결하면",
    story
  };
}

function getProteinContext(protein) {
  const text = [
    protein.name,
    protein.englishName,
    protein.koreanName,
    protein.family,
    protein.description,
    protein.quickSummary,
    protein.stateLabel,
    protein.stateReason,
    protein.method,
    ...(protein.features || []).flat()
  ].join(" ");

  return {
    text,
    lower: text.toLowerCase(),
    isHemoglobin: /h[ae]moglobin|heme|haem|hb\b|헴|헤모글로빈/i.test(text),
    isEnzyme: /enzyme|ase\b|kinase|protease|polymerase|nuclease|ribonuclease|lysozyme|catalase|효소|분해|촉매/i.test(text),
    isNucleicAcid: /dna|rna|nuclease|cas9|crispr|transcription|polymerase|nucleic|핵산|전사/i.test(text),
    isLigandBound: /ligand|bound|substrate|inhibitor|cofactor|metal|heme|zinc|calcium|atp|nad|fad|결합|기질|억제제|보조인자|금속|헴/i.test(text),
    isOligomer: /dimer|trimer|tetramer|oligomer|multimer|assembly|complex|subunit|사슬|복합체|올리고머|서브유닛/i.test(text),
    isPrediction: protein.source === "AlphaFold"
  };
}

function describeChainGuide(protein, facts, context, isEn) {
  const chains = Array.isArray(facts.chains) ? facts.chains : [];
  const chainList = chains.length ? chains.slice(0, 6).join(", ") : "";
  const chainSuffix = chains.length > 6 ? (isEn ? ` and ${chains.length - 6} more` : ` 외 ${chains.length - 6}개`) : "";

  if (context.isHemoglobin) {
    return isEn
      ? `Hemoglobin is usually read as a four-subunit machine: two alpha-like and two beta-like chains move together, and the heme groups explain oxygen binding. ${chainList ? `This file shows chain labels ${chainList}${chainSuffix}.` : "Check whether the visible chains form the expected tetramer."}`
      : `헤모글로빈은 보통 4개의 서브유닛이 함께 움직이는 산소 운반 장치로 읽습니다. 알파형/베타형 사슬과 헴 위치를 같이 보면 산소 결합 원리가 보입니다. ${chainList ? `이 구조 파일에서는 체인 ${chainList}${chainSuffix}가 보입니다.` : "보이는 체인이 4량체 조립을 이루는지 먼저 확인하세요."}`;
  }

  if (context.isPrediction) {
    return isEn
      ? "AlphaFold entries usually show one predicted chain. Read chain A as the main fold, then use confidence coloring to separate rigid domains from flexible linkers."
      : "AlphaFold 구조는 보통 하나의 예측 사슬을 보여줍니다. 체인 A를 중심 접힘으로 보고, 신뢰도 색상으로 단단한 도메인과 유연한 연결부를 나눠 보세요.";
  }

  if (chains.length) {
    return isEn
      ? `This asymmetric unit contains chain labels ${chainList}${chainSuffix}. Similar chains may be repeated subunits; different chains often mark partners in a complex. Compare the interfaces where chains touch.`
      : `이 asymmetric unit에는 체인 ${chainList}${chainSuffix}가 들어 있습니다. 같은 모양의 체인은 반복 서브유닛일 수 있고, 다른 체인은 복합체 파트너일 수 있습니다. 체인끼리 맞닿는 접촉면을 먼저 비교하세요.`;
  }

  if (context.isOligomer) {
    return isEn
      ? "The title suggests a multichain assembly. Use ribbon coloring to separate chains and focus on the interface where subunits stabilize or regulate each other."
      : "이 구조는 여러 사슬이 함께 작동하는 조립체일 가능성이 큽니다. 리본 색으로 체인을 나누고, 서브유닛이 서로 맞닿는 접촉면을 중심으로 보세요.";
  }

  return isEn
    ? "Start from the chain labels in the viewer. One chain usually represents one polypeptide; multiple chains can mean repeated subunits, binding partners, or a crystallographic assembly."
    : "뷰어의 체인 라벨부터 시작하세요. 보통 체인 하나는 폴리펩타이드 하나이고, 여러 체인은 반복 서브유닛, 결합 파트너, 결정 내 조립 상태를 의미할 수 있습니다.";
}

function describeSiteGuide(protein, facts, context, isEn) {
  const ligands = Array.isArray(facts.ligands) ? facts.ligands.filter((item) => item !== "HOH").slice(0, 5) : [];
  const ligandText = ligands.length ? ligands.join(", ") : "";

  if (context.isHemoglobin || ligands.includes("HEM")) {
    return isEn
      ? `${ligandText ? `Detected ligand candidates include ${ligandText}. ` : ""}Focus on heme: the iron center is the functional hotspot where oxygen or related small molecules bind.`
      : `${ligandText ? `감지된 리간드 후보는 ${ligandText}입니다. ` : ""}헴을 먼저 보세요. 철 중심이 산소나 작은 분자가 붙는 기능의 핵심 지점입니다.`;
  }

  if (ligandText) {
    return isEn
      ? `Detected ligand candidates include ${ligandText}. Switch to stick view and inspect the pocket around these small molecules, metals, or cofactors.`
      : `감지된 리간드 후보는 ${ligandText}입니다. 스틱 보기로 바꾼 뒤 작은 분자, 금속, 보조인자 주변 포켓을 확인하세요.`;
  }

  if (context.isNucleicAcid) {
    return isEn
      ? "Look for positively charged grooves and bound DNA/RNA. These interfaces explain sequence recognition, cutting, copying, or regulation."
      : "양전하가 모인 홈과 DNA/RNA가 닿는 면을 찾으세요. 그 접촉면이 서열 인식, 절단, 복제, 조절 기능을 설명합니다.";
  }

  if (context.isEnzyme) {
    return isEn
      ? "For enzymes, the active site is usually a pocket where conserved residues, metals, or substrates gather. Surface or stick view makes that pocket easier to read."
      : "효소라면 활성 부위는 보존 잔기, 금속, 기질이 모이는 포켓인 경우가 많습니다. 표면 보기나 스틱 보기로 홈 주변을 좁혀보세요.";
  }

  if (context.isLigandBound) {
    return isEn
      ? "The description suggests a bound state. Look for non-protein atoms or surface pockets because those often mark functional regulation sites."
      : "설명상 결합형 구조일 가능성이 있습니다. 단백질이 아닌 원자나 표면의 홈을 찾으면 기능 조절 위치를 파악하기 쉽습니다.";
  }

  return isEn
    ? "No obvious ligand is guaranteed from the title alone, so use surface view to find grooves, exposed charged patches, and conserved-looking pockets."
    : "제목만으로 뚜렷한 리간드를 단정할 수 없으므로 표면 보기에서 홈, 노출된 전하성 패치, 보존되어 보이는 포켓을 찾아보세요.";
}

function describeFirstLook(protein, facts, context, isEn) {
  if (context.isHemoglobin) {
    return isEn
      ? [
          "Check whether the four subunits form the expected tetramer.",
          "Find heme groups and the iron center that bind oxygen.",
          "Compare this state with T/R or ligand-bound hemoglobin when related structures are listed."
        ]
      : [
          "4개의 서브유닛이 어떤 모양으로 모여 있는지 확인하기",
          "헴과 철 중심을 찾아 산소 결합 위치 보기",
          "관련 구조가 있으면 T 상태/R 상태 또는 결합형 차이 비교하기"
        ];
  }

  const quality = protein.source === "AlphaFold"
    ? isEn
      ? "Use confidence coloring to avoid over-reading uncertain loops."
      : "신뢰도 색상으로 불확실한 루프를 과해석하지 않기"
    : isEn
      ? "Check resolution and B-factor before trusting fine atomic details."
      : "세밀한 원자 배치를 믿기 전에 해상도와 B-factor 확인하기";

  return isEn
    ? [
        "Read the overall fold and domain boundaries in ribbon view.",
        context.isNucleicAcid ? "Find where DNA/RNA or charged grooves touch the protein." : "Find pockets, ligands, metals, or exposed interfaces.",
        quality
      ]
    : [
        "리본 보기에서 전체 접힘과 도메인 경계 읽기",
        context.isNucleicAcid ? "DNA/RNA 또는 전하성 홈이 단백질과 닿는 위치 찾기" : "포켓, 리간드, 금속, 노출된 접촉면 찾기",
        quality
      ];
}

function describeFunctionStory(protein, facts, context, isEn) {
  const stateHint = stripTrailingStructureId(localizedStateReason(protein), protein);

  if (context.isHemoglobin) {
    return isEn
      ? "Hemoglobin turns structure into function through coordinated chain movement: heme binds oxygen, and the T-to-R shift explains cooperative oxygen transport."
      : "헤모글로빈은 사슬들이 함께 움직이면서 기능이 생깁니다. 헴이 산소를 붙잡고, T 상태에서 R 상태로 바뀌는 구조 변화가 산소 운반의 협동성을 설명합니다.";
  }

  if (context.isNucleicAcid) {
    return isEn
      ? "The fold positions charged and sequence-reading surfaces so the protein can recognize, copy, cut, or regulate DNA/RNA."
      : "이 접힘은 전하성 표면과 서열을 읽는 면을 특정 위치에 배치합니다. 그래서 단백질이 DNA/RNA를 인식하거나 복제, 절단, 조절할 수 있습니다.";
  }

  if (context.isEnzyme) {
    return isEn
      ? "The fold brings catalytic residues into the same pocket, so a chemical reaction can happen faster and more selectively than it would in solution."
      : "효소 구조에서는 촉매 잔기들이 같은 포켓에 모입니다. 그래서 용액 속에서보다 반응이 더 빠르고 선택적으로 일어날 수 있습니다.";
  }

  if (context.isOligomer) {
    return isEn
      ? "The assembly matters because each chain can stabilize, activate, or regulate the others; interfaces are part of the functional story."
      : "여러 사슬의 조립 자체가 기능의 일부입니다. 각 체인은 다른 체인을 안정화하거나 활성화하고, 접촉면이 조절 위치가 될 수 있습니다.";
  }

  return stateHint || (isEn
    ? "Connect the visible fold to function by asking: what surface is exposed, what pocket could bind something, and which region looks stable enough to trust?"
    : "보이는 접힘을 기능과 연결하려면 세 가지를 물어보면 됩니다. 어떤 표면이 노출되어 있는지, 무엇이 붙을 만한 포켓이 있는지, 어느 영역이 안정적으로 믿을 만한지입니다.");
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
  if (state.language !== "en") {
    const name = getDisplayName(protein);
    const stateReason = stripTrailingStructureId(localizedStateReason(protein), protein);
    return [
      ["blue", "무엇을 하는가", `${name}의 구조는 이 단백질이 세포 안에서 어떤 일을 하는지 이해하기 위한 지도입니다. 접힘 모양, 표면의 홈, 결합 부위를 함께 보면 기능을 더 쉽게 연결할 수 있습니다.`],
      ["purple", "구조에서 볼 것", "리본에서는 전체 접힘과 도메인 배치를 보고, 스틱/표면 보기에서는 결합 부위 주변 원자와 표면 노출을 확인하세요."],
      ["green", "비교 포인트", stateReason || "다른 구조 후보와 비교하면서 리간드, 체인 수, 해상도, 변이 위치가 어떻게 달라지는지 확인하세요."],
      ["amber", "주의할 점", "하나의 구조는 특정 실험 조건이나 예측 상태를 보여줍니다. 기능을 단정하기보다 참고문헌, 결합 분자, 다른 구조와 함께 해석하는 것이 좋습니다."]
    ];
  }
  return [
    ["blue", "What it does", "Use this structure as a map for connecting the fold, surface pockets, and binding sites to the protein's biological role."],
    ["purple", "What to inspect", "Use ribbon view for the overall fold and stick or surface views for local atoms, pockets, and exposed interfaces."],
    ["green", "Comparison point", stripTrailingStructureId(localizedStateReason(protein), protein) || "Compare ligands, chain assembly, resolution, and mutation sites against related structures."],
    ["amber", "Caution", "One structure captures one experimental or predicted state. Interpret it together with references, bound molecules, and related structures."]
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
        ${renderStructureGuide(protein)}
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
          <button type="button" data-export-pdf>PDF 변환</button>
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

  return `
    <section class="section pro-section">
      <h3>구조 비교</h3>
      <p class="section-lead">검색된 상태별 구조를 나란히 보면서 결합 상태와 기능 차이를 비교합니다.</p>
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
  const pdbUrl = protein.pdbId ? `https://www.rcsb.org/structure/${encodeURIComponent(protein.pdbId)}` : "";
  const alphaFoldUrl = buildAlphaFoldExternalUrl(protein);

  return `
    <section class="section compact-section">
      <h3>${t("sourceLinks")}</h3>
      <div class="tool-grid">
        ${pdbUrl
          ? `<a class="secondary-button link-button" href="${escapeHtml(pdbUrl)}" target="_blank" rel="noreferrer">${t("viewPdb")}</a>`
          : `<a class="secondary-button link-button disabled-link" aria-disabled="true">${t("noPdbCandidate")}</a>`}
        <a class="secondary-button link-button" href="${escapeHtml(alphaFoldUrl)}" target="_blank" rel="noreferrer">${t("viewAlphaFold")}</a>
        <a class="secondary-button link-button" href="${escapeHtml(literatureUrl)}" target="_blank" rel="noreferrer">${t("searchLiterature")}</a>
        <a class="secondary-button link-button" href="${escapeHtml(protein.cifDownloadUrl)}" target="_blank" rel="noreferrer">${t("saveMmcif")}</a>
      </div>
    </section>

    <div class="viewer-action-stack">
      <button class="report-button note-save-button" type="button" data-save-note>${saved ? t("noteSaved") : t("saveNote")}</button>
      <button class="report-button" type="button" data-open-report>${t("createProReport")}</button>
    </div>
    ${state.saveMessage ? `<div class="save-message">${escapeHtml(state.saveMessage)}</div>` : ""}
  `;
}

function buildAlphaFoldExternalUrl(protein) {
  if (protein.accession) return `https://alphafold.ebi.ac.uk/entry/${encodeURIComponent(protein.accession)}`;
  const query = protein.englishName || protein.name || protein.pdbId || "";
  return `https://alphafold.ebi.ac.uk/search/text/${encodeURIComponent(query)}`;
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
      state.isLearningOpen = !state.isLearningOpen;
      if (!state.isLearningOpen) {
        state.learningAi = { loading: false, content: "", error: "" };
      }
      render();
    });
  }

  document.querySelectorAll("[data-learning-topic]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeLearningTopic = button.dataset.learningTopic;
      state.learningAi = { loading: false, content: "", error: "" };
      render();
    });
  });

  const learningAiButton = document.querySelector("[data-learning-ai]");
  if (learningAiButton) {
    learningAiButton.addEventListener("click", async () => {
      const topics = getLearningTopics();
      const topic = topics.find((item) => item.id === state.activeLearningTopic) || topics[0];
      state.learningAi = { loading: true, content: "", error: "" };
      trackAnalyticsEvent("learning_ai_expand_click", {
        topicId: topic.id,
        topicTitle: topic.title
      });
      render();

      try {
        const content = await generateLearningExpansion(topic);
        state.learningAi = { loading: false, content, error: "" };
      } catch {
        state.learningAi = {
          loading: false,
          content: "",
          error: state.language === "ko"
            ? "AI 학습 확장을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요."
            : "Could not generate the AI learning expansion. Please try again later."
        };
      }
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
      trackAnalyticsEvent("search_result_click", {
        query: state.query,
        resultIndex: Number(button.dataset.result),
        proteinId: getProteinKey(state.selected),
        proteinName: getDisplayName(state.selected),
        source: state.selected.source
      });
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
    let longPressTriggered = false;

    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      renameProject(button.dataset.projectRename);
    });

    button.addEventListener("dblclick", (event) => {
      event.preventDefault();
      renameProject(button.dataset.projectRename);
    });

    button.addEventListener("pointerdown", () => {
      longPressTriggered = false;
      window.clearTimeout(state.projectRenameTimer);
      state.projectRenameTimer = window.setTimeout(() => {
        longPressTriggered = true;
        renameProject(button.dataset.projectRename);
      }, 650);
    });

    ["pointerup", "pointerleave", "pointercancel"].forEach((eventName) => {
      button.addEventListener(eventName, () => {
        window.clearTimeout(state.projectRenameTimer);
      });
    });

    button.addEventListener("click", () => {
      if (longPressTriggered) return;
      state.currentProjectId = button.dataset.projectId;
      state.isSidebarOpen = false;
      render();
    });
  });

  document.querySelectorAll("[data-recent-query]").forEach((button) => {
    button.addEventListener("click", () => {
      scheduleSearch(button.dataset.recentQuery);
    });
  });

  document.querySelectorAll("[data-recent-delete]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      state.recentProteins = deleteRecentProtein(button.dataset.recentDelete);
      render();
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
      state.isLearningOpen = false;
      state.isSidebarOpen = false;
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

  const saveNoteButton = document.querySelector("[data-save-note]");
  if (saveNoteButton && state.selected) {
    saveNoteButton.addEventListener("click", () => {
      const key = getProteinKey(state.selected);
      const evidence = state.literature[key];
      trackAnalyticsEvent("save_note_click", {
        proteinId: key,
        proteinName: getDisplayName(state.selected),
        projectId: state.currentProjectId
      });
      state.reportSnapshot = captureViewerSnapshot();
      state.notes = saveNote(state.selected, evidence, state.currentProjectId, state.reportSnapshot);
      state.saveMessage = state.language === "en"
        ? "Saved to Protein Note. You can reopen it from the home screen."
        : "Protein Note에 저장했습니다. 홈 화면에서 다시 열 수 있습니다.";
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
      trackAnalyticsEvent("report_create_click", {
        proteinId: state.selected ? getProteinKey(state.selected) : "",
        proteinName: state.selected ? getDisplayName(state.selected) : ""
      });
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

  const exportPdfButton = document.querySelector("[data-export-pdf]");
  if (exportPdfButton && state.selected) {
    exportPdfButton.addEventListener("click", () => {
      exportReportPdf(state.selected, state.literature[getProteinKey(state.selected)]);
    });
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

function exportReportPdf(protein, evidence) {
  const printWindow = window.open("", "_blank", "width=920,height=900");
  if (!printWindow) {
    window.alert("팝업이 차단되어 PDF 변환 창을 열 수 없습니다. 브라우저 팝업 허용 후 다시 시도해 주세요.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildReportPrintHtml(protein, evidence));
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => {
    printWindow.print();
  }, 350);
}

function buildReportPrintHtml(protein, evidence) {
  const claims = (evidence?.claims || []).slice(0, 4);
  const articles = (evidence?.articles || []).slice(0, 6);
  const features = localizedFeatures(protein);
  const title = `${getDisplayName(protein)} FoldNote Report`;

  return `<!doctype html>
<html lang="${state.language === "en" ? "en" : "ko"}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #172033; font-family: Arial, sans-serif; line-height: 1.55; }
    h1 { margin: 0 0 6px; font-size: 26px; }
    h2 { margin: 24px 0 10px; font-size: 17px; }
    p, li { font-size: 12.5px; }
    .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 16px 0; }
    .meta div, section { border: 1px solid #d8e1ed; border-radius: 8px; padding: 12px; }
    .meta span { display: block; color: #64748b; font-size: 10px; text-transform: uppercase; }
    .meta strong { display: block; margin-top: 3px; font-size: 13px; }
    img { width: 100%; max-height: 260px; object-fit: contain; border-radius: 8px; background: #111827; }
    section { margin-top: 12px; break-inside: avoid; background: #f8fafc; }
    a { color: #174ea6; }
    .claim { margin-top: 8px; padding: 8px; border-left: 3px solid #316ff6; background: #ffffff; }
    .notice { color: #64748b; font-size: 11px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="notice">${state.language === "en" ? "Automatically generated educational summary. Verify before research or professional use." : "자동 생성된 교육용 요약입니다. 연구나 전문적 사용 전에는 반드시 확인하세요."}</p>
  ${state.reportSnapshot ? `<img src="${state.reportSnapshot}" alt="Structure snapshot" />` : ""}
  <div class="meta">
    <div><span>Source</span><strong>${escapeHtml(protein.source || "-")}</strong></div>
    <div><span>ID</span><strong>${escapeHtml(protein.pdbId || protein.accession || "AlphaFold")}</strong></div>
    <div><span>Organism</span><strong>${escapeHtml(protein.organism || "-")}</strong></div>
    <div><span>Method</span><strong>${escapeHtml(protein.method || "-")}</strong></div>
    <div><span>Resolution</span><strong>${escapeHtml(protein.resolution || "-")}</strong></div>
    <div><span>Mass</span><strong>${escapeHtml(protein.mass || "-")}</strong></div>
  </div>
  <section>
    <h2>${state.language === "en" ? "Structure Overview" : "구조 개요"}</h2>
    <p>${escapeHtml(localizedDescription(protein))}</p>
  </section>
  <section>
    <h2>${state.language === "en" ? "Function Summary" : "기능 요약"}</h2>
    <ul>${features.map(([, label, text]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(text)}</li>`).join("")}</ul>
  </section>
  <section>
    <h2>${state.language === "en" ? "Evidence Sentences" : "근거 문장"}</h2>
    ${claims.length
      ? claims.map((claim) => `<div class="claim"><p>${escapeHtml(claim.sentence)}</p><p><a href="${escapeHtml(claim.sourceUrl)}">${escapeHtml(claim.sourceTitle)}</a> · ${escapeHtml(claim.journal)} · ${escapeHtml(claim.year)}</p></div>`).join("")
      : `<p>${state.language === "en" ? "No literature evidence has loaded yet." : "아직 불러온 논문 근거가 없습니다."}</p>`}
  </section>
  <section>
    <h2>${state.language === "en" ? "References" : "참고문헌"}</h2>
    <ol>${articles.length
      ? articles.map((article) => `<li>${escapeHtml(article.title)} (${escapeHtml(article.year)}) ${article.url ? `<a href="${escapeHtml(article.url)}">${escapeHtml(article.url)}</a>` : ""}</li>`).join("")
      : `<li>${state.language === "en" ? "No references available." : "표시할 참고문헌이 없습니다."}</li>`}</ol>
  </section>
</body>
</html>`;
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
    state.structureFacts[getProteinKey(protein)] = parseStructureFacts(structureText);
    refreshStructureGuide(protein);
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

function parseStructureFacts(structureText) {
  const chains = new Map();
  const ligands = new Set();
  const ligandSkip = new Set(["HOH", "WAT", "DOD"]);
  const lines = String(structureText || "").split(/\r?\n/);

  for (const line of lines) {
    if (!/^(ATOM|HETATM)\s/.test(line)) continue;
    const parts = line.trim().split(/\s+/);
    const group = parts[0];
    const component = (parts[5] || "").replace(/['"]/g, "").toUpperCase();
    const chain = (parts[6] || "").replace(/['"]/g, "");
    if (chain && chain !== ".") {
      const current = chains.get(chain) || { residues: new Set(), atoms: 0 };
      current.atoms += 1;
      const residueId = parts[8] || parts[15] || parts[1];
      if (residueId && residueId !== ".") current.residues.add(residueId);
      chains.set(chain, current);
    }
    if (group === "HETATM" && component && !ligandSkip.has(component)) {
      ligands.add(component);
    }
  }

  return {
    chains: [...chains.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).slice(0, 16),
    chainStats: [...chains.entries()].map(([id, stats]) => ({
      id,
      residues: stats.residues.size,
      atoms: stats.atoms
    })),
    ligands: [...ligands].sort().slice(0, 12)
  };
}

function refreshStructureGuide(protein) {
  const guide = document.querySelector("[data-structure-guide]");
  if (!guide || !state.selected || getProteinKey(state.selected) !== getProteinKey(protein)) return;
  guide.outerHTML = renderStructureGuide(protein);
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

  highlightFunctionalHotspots();
  state.viewer.render();
}

function highlightFunctionalHotspots() {
  if (!state.viewer) return;
  const cofactors = ["HEM", "HEC", "NAD", "NAP", "FAD", "FMN", "ATP", "ADP", "GTP", "GDP", "SAM", "SAH"];
  const metals = [
    ["FE", "#d97706"],
    ["ZN", "#64748b"],
    ["MG", "#22c55e"],
    ["CA", "#38bdf8"],
    ["MN", "#a855f7"]
  ];

  cofactors.forEach((resn) => {
    state.viewer.setStyle({ resn }, { stick: { radius: 0.34, colorscheme: "greenCarbon" } });
  });
  metals.forEach(([elem, color]) => {
    state.viewer.setStyle({ elem }, { sphere: { scale: 0.46, color } });
  });
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
  const unitInfo = describeAsymmetricUnit(atom, chain);
  const element = atom.elem || atom.element || "원자";
  const atomName = atom.atom || atom.name || element;
  const confidence = typeof atom.b === "number" ? Math.round(atom.b) : null;
  const details = describeResidue(residueName, atomName, element, confidence);
  const chainRole = describeClickedChainRole(state.selected, chain);
  const pane = document.querySelector(".viewer-pane");
  const paneRect = pane.getBoundingClientRect();
  const clientX = event?.clientX ?? paneRect.left + paneRect.width / 2;
  const clientY = event?.clientY ?? paneRect.top + paneRect.height / 2;
  const x = Math.min(Math.max(clientX - paneRect.left + 14, 12), paneRect.width - 286);
  const y = Math.min(Math.max(clientY - paneRect.top + 14, 12), paneRect.height - 190);

  tooltip.innerHTML = `
    <div class="tooltip-unit">
      <span>Asymmetric Unit</span>
      <strong>${escapeHtml(unitInfo.primary)}</strong>
      ${unitInfo.secondary ? `<small>${escapeHtml(unitInfo.secondary)}</small>` : ""}
    </div>
    <strong>${escapeHtml(residueName)} ${escapeHtml(residueNumber)}</strong>
    <span>체인 ${escapeHtml(chain)} · ${escapeHtml(atomName)} 원자${confidence === null ? "" : ` · 값 ${confidence}`}</span>
    <p>${escapeHtml(details.summary)}</p>
    <ul>
      ${chainRole ? `<li>${escapeHtml(chainRole)}</li>` : ""}
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

function describeAsymmetricUnit(atom, chain) {
  const model = atom.model ?? atom.modelIndex ?? atom.serialModel;
  const sym = atom.symmet ?? atom.symmetry ?? atom.symop;
  const assembly = atom.assembly ?? atom.assemblyId;
  const secondary = [
    model !== undefined ? `model ${model}` : "",
    sym ? `symmetry ${sym}` : "",
    assembly ? `assembly ${assembly}` : ""
  ].filter(Boolean).join(" · ");

  return {
    primary: `Chain ${chain || "-"}`,
    secondary
  };
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

function describeClickedChainRole(protein, chain) {
  if (!protein || !chain || chain === "-") return "";
  const context = getProteinContext(protein);
  const facts = state.structureFacts[getProteinKey(protein)] || {};
  const stats = (facts.chainStats || []).find((item) => item.id === chain);
  const residueCount = stats?.residues ? `, 약 ${stats.residues}개 잔기` : "";

  if (context.isHemoglobin) {
    return `체인 해석: ${chain} 체인은 헤모글로빈 4량체를 이루는 서브유닛 중 하나입니다. 헴 주변과 다른 체인 접촉면을 함께 보면 산소 결합 상태를 이해하기 쉽습니다.`;
  }

  if (context.isPrediction) {
    return `체인 해석: ${chain} 체인은 예측 모델의 주 사슬입니다${residueCount}. 신뢰도 색상과 함께 도메인 경계인지 확인해 보세요.`;
  }

  if ((facts.chains || []).length > 1) {
    return `체인 해석: ${chain} 체인은 이 asymmetric unit 안의 독립 사슬 중 하나입니다${residueCount}. 다른 체인과 맞닿는 면이면 복합체 기능과 관련될 수 있습니다.`;
  }

  return `체인 해석: ${chain} 체인의 한 위치입니다${residueCount}. 주변 표면 노출과 결합 후보 원자를 함께 보면 기능적 의미를 잡기 좋습니다.`;
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
    sourceLinks: "자료 링크",
    viewPdb: "PDB 보기",
    viewAlphaFold: "AlphaFold 보기",
    noPdbCandidate: "PDB 후보 없음",
    searchLiterature: "논문 검색",
    saveMmcif: "mmCIF 저장",
    saveNote: "노트 저장",
    noteSaved: "노트 저장됨",
    createProReport: "Pro 리포트 생성",
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
    sourceLinks: "Source Links",
    viewPdb: "View PDB",
    viewAlphaFold: "View AlphaFold",
    noPdbCandidate: "No PDB candidate",
    searchLiterature: "Search Papers",
    saveMmcif: "Save mmCIF",
    saveNote: "Save Note",
    noteSaved: "Note Saved",
    createProReport: "Create Pro Report",
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
