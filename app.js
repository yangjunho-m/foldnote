import {
  icons,
  recommendedProteins,
  residueDescriptions
} from "./src/catalog.js";
import { fetchLiteratureEvidence } from "./src/literatureService.js";
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
  infoMode: "simple",
  literature: {},
  literatureErrors: {},
  literatureLoading: {},
  recommendations: [],
  theme: "light",
  isHelpOpen: false
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
  state.isLoading = true;
  render();
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
  return protein.pdbId || protein.accession || protein.englishName || protein.name;
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
        ${state.selected ? renderViewer(state.selected) : renderSearch()}
      </main>
      <button class="help-float" type="button" data-help-open aria-label="도움말">?</button>
      ${state.isHelpOpen ? renderHelpModal() : ""}
    </div>
  `;

  bindEvents();
  if (state.selected) {
    initProteinViewer(state.selected);
    ensureLiterature(state.selected);
  }
}

function renderTopbar() {
  return `
    <header class="topbar">
      <button class="brand brand-button" type="button" data-home title="홈으로" aria-label="FoldNote 홈으로">
        <div class="brand-mark" aria-hidden="true">${icons.fold}</div>
        <div>
          <h1 class="brand-title">FoldNote <span>폴드노트</span></h1>
          <p class="brand-subtitle">단백질 구조를 쉽게 읽는 노트</p>
        </div>
      </button>
      <div class="topbar-actions">
        <button class="icon-button" type="button" data-home title="홈으로" aria-label="홈으로">
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
        </button>
        <button class="icon-button" type="button" data-random-recommend title="추천 단백질 바꾸기" aria-label="추천 단백질 바꾸기">
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4"/><path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4"/></svg>
        </button>
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
  return `
    <section class="search-screen">
      <div class="search-wrap">
        <div class="hero">
          <div class="hero-icon" aria-hidden="true">${icons.search}</div>
          <h2>단백질 구조를 검색하세요</h2>
          <p>단백질 이름이나 PDB ID를 입력하면 구조와 기능, 근거 자료를 함께 확인할 수 있습니다</p>
        </div>

        <form class="search-form" data-search-form>
          <span class="search-symbol" aria-hidden="true">${icons.search}</span>
          <input
            class="search-input"
            data-search-input
            type="search"
            value="${escapeHtml(state.query)}"
            placeholder="예: p53, 헤모글로빈, 인슐린, 1HHO..."
            autocomplete="off"
          />
        </form>

        ${renderSearchState()}
        ${renderRecommendations()}
        ${renderTips()}
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
          <strong>RCSB PDB에서 후보를 찾고 있습니다</strong>
          <p>검색어를 PDB 실험 구조 데이터베이스에 질의하는 중입니다.</p>
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
          <button class="result-card" type="button" data-result="${index}">
            <div class="result-title-row">
              <h3 class="result-title">${escapeHtml(protein.name)} (${escapeHtml(protein.englishName)})</h3>
              ${badge(protein)}
            </div>
            <div class="result-meta">
              <span>${protein.pdbId ? `PDB ID: <span class="code-pill">${protein.pdbId}</span>` : `UniProt: <span class="code-pill">${protein.accession || "-"}</span>`}</span>
              <span>생물종: ${escapeHtml(protein.organism)}</span>
              <span>전문 탭에서 논문 근거 확인</span>
            </div>
          </button>
        `
        )
        .join("")}
    </div>
  `;
}

function renderHelpModal() {
  return `
    <div class="help-backdrop" data-help-close>
      <section class="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <button class="modal-close" type="button" data-help-close aria-label="닫기">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>
        </button>
        <h2 id="help-title">FoldNote 도움말</h2>
        <p>검색 결과를 선택한 뒤 오른쪽 패널의 전문 탭에서 구조 판독, 논문 근거 요약, 연관 키워드, 참고문헌을 볼 수 있습니다.</p>

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
          <h3>오늘의 추천 단백질</h3>
          <p>어디서부터 볼지 모르겠다면 이런 단백질부터 시작해보세요.</p>
        </div>
        <button class="icon-button refresh-button" type="button" data-refresh-recommendations aria-label="추천 새로고침">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4"/><path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4"/></svg>
        </button>
      </div>
      <div class="recommend-grid">
        ${items
          .map(
            (item) => `
              <button class="recommend-card" type="button" data-recommend-query="${escapeHtml(item.query)}">
                <span>${escapeHtml(item.tag)}</span>
                <strong>${escapeHtml(item.name)}</strong>
                <p>${escapeHtml(item.note)}</p>
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
        <h3>검색 팁</h3>
        <ul>
          <li>한글 또는 영문 단백질 이름으로 검색할 수 있습니다</li>
          <li>PDB ID(예: 1HHO)로 직접 검색도 가능합니다</li>
          <li>전문 탭에서 관련 초록, 연관 DNA/RNA/단백질, 참고문헌을 볼 수 있습니다</li>
        </ul>
      </div>
    </aside>
  `;
}

function getRandomRecommendations() {
  return [...recommendedProteins]
    .sort(() => Math.random() - 0.5)
    .slice(0, 4);
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
            <p>${protein.source} 실제 구조 시각화</p>
            <h2>${escapeHtml(protein.name)} (${escapeHtml(protein.englishName)})</h2>
          </div>
        </div>
        <div class="control-strip" aria-label="구조 보기 컨트롤">
          <button class="glass-button ${state.viewerStyle === "cartoon" ? "active" : ""}" type="button" data-view-style="cartoon" title="리본 보기">리본</button>
          <button class="glass-button ${state.viewerStyle === "stick" ? "active" : ""}" type="button" data-view-style="stick" title="원자 결합 보기">스틱</button>
          <button class="glass-button ${state.viewerStyle === "sphere" ? "active" : ""}" type="button" data-view-style="sphere" title="공간 채움 보기">구체</button>
          <button class="glass-button ${state.viewerStyle === "surface" ? "active" : ""}" type="button" data-view-style="surface" title="분자 표면 보기">표면</button>
          <button class="glass-button ${state.viewerStyle === "confidence" ? "active" : ""}" type="button" data-view-style="confidence" title="B-factor 또는 pLDDT 색상 보기">신뢰도</button>
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
          <h2>${escapeHtml(protein.name)}</h2>
          ${badge(protein)}
        </div>
        <p class="brand-subtitle">${escapeHtml(protein.englishName)}</p>

        <div class="panel-tabs" role="tablist" aria-label="정보 깊이 선택">
          <button class="${state.infoMode === "simple" ? "active" : ""}" type="button" data-info-mode="simple">기본</button>
          <button class="${state.infoMode === "pro" ? "active" : ""}" type="button" data-info-mode="pro">전문</button>
        </div>

        <div class="meta-grid">
          <div class="metric"><span>${protein.source === "PDB" ? "PDB ID" : "UniProt"}</span><strong>${protein.pdbId || protein.accession || "AlphaFold"}</strong></div>
          <div class="metric"><span>생물종</span><strong>${escapeHtml(protein.organism)}</strong></div>
          <div class="metric"><span>방법</span><strong>${escapeHtml(protein.method)}</strong></div>
          <div class="metric"><span>해상도</span><strong>${escapeHtml(protein.resolution)}</strong></div>
          <div class="metric"><span>크기</span><strong>${escapeHtml(protein.size)}</strong></div>
          <div class="metric"><span>분자량</span><strong>${escapeHtml(protein.mass)}</strong></div>
        </div>

        ${state.infoMode === "pro" ? renderProfessionalInfo(protein) : renderSimpleInfo(protein)}
      </div>
    </aside>
  `;
}

function renderSimpleInfo(protein) {
  return `
    <section class="section">
      <h3>쉬운 설명</h3>
      <p>${escapeHtml(protein.description)}</p>
    </section>

    <section class="section">
      <h3>주요 특징</h3>
      <div class="feature-list">
        ${protein.features
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
      <h3>신뢰도</h3>
      <p>${escapeHtml(protein.confidence)}입니다. AlphaFold 구조라면 잔기별 pLDDT 색상과 낮은 신뢰도 구간을 반드시 함께 보여주는 것이 좋습니다.</p>
    </section>

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

  return `
    <section class="section pro-section">
      <h3>논문 근거 요약</h3>
      <p class="section-lead">Europe PMC 초록에서 구조, 기능, 상호작용 문장을 골라 짧게 정리합니다.</p>
      <div class="evidence-summary">
        ${evidence.summary
          .map((sentence) => `<p>${escapeHtml(sentence)}</p>`)
          .join("")}
      </div>
    </section>

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
      <p class="section-lead">제목을 누르면 DOI 또는 Europe PMC 원문 페이지로 이동합니다.</p>
      <div class="reference-list">
        ${evidence.articles.length
          ? evidence.articles.map(renderReference).join("")
          : "<p>표시할 참고문헌이 없습니다.</p>"}
      </div>
    </section>
  `;
}

function renderReference(article) {
  return `
    <article class="reference-item">
      <a href="${escapeHtml(article.url)}" target="_blank" rel="noreferrer">${escapeHtml(article.title)}</a>
      <p>${escapeHtml(article.authors)}</p>
      <span>${escapeHtml(article.journal)} · ${escapeHtml(article.year)} · 인용 ${article.citedByCount}</span>
    </article>
  `;
}

function renderProfessionalInfo(protein) {
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
        <span>동종 구조 비교</span>
      </div>
    </section>

    ${renderResearchTools(protein)}
  `;
}

function renderResearchTools(protein) {
  const literatureUrl = buildLiteratureSearchUrl(protein);

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
      <button class="secondary-button" type="button">해설 저장</button>
    </div>
  `;
}

function buildLiteratureSearchUrl(protein) {
  const term = protein.pdbId || protein.accession || protein.englishName || protein.name;
  const query = `"${term}" protein structure function`;
  return `https://europepmc.org/search?query=${encodeURIComponent(query)}`;
}

function renderColorLegend(protein) {
  if (state.viewerStyle === "confidence") {
    return `
      <div class="viewer-legend">
        <h3>색상 의미</h3>
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
        <h3>색상 의미</h3>
        <div><span style="background:#909090"></span>탄소 C</div>
        <div><span style="background:#3050f8"></span>질소 N</div>
        <div><span style="background:#ff0d0d"></span>산소 O</div>
        <div><span style="background:#ffff30"></span>황 S</div>
      </div>
    `;
  }

  return `
    <div class="viewer-legend">
      <h3>색상 의미</h3>
      <div><span class="spectrum"></span>사슬의 처음부터 끝까지</div>
      <div><span style="background:#58c4dd"></span>리본: 단백질의 주된 접힘 경로</div>
      <div><span style="background:#4ade80"></span>스틱: 결합 부위의 작은 분자</div>
      <div><span style="background:#f59e0b"></span>색 변화: 서로 다른 사슬/영역 구분</div>
    </div>
  `;
}

function bindEvents() {
  const input = document.querySelector("[data-search-input]");
  const form = document.querySelector("[data-search-form]");

  const homeButton = document.querySelector("[data-home]");
  if (homeButton) {
    homeButton.addEventListener("click", () => {
      window.clearTimeout(state.debounceTimer);
      state.query = "";
      state.results = [];
      state.error = "";
      state.notice = "";
      state.isLoading = false;
      state.selected = null;
      state.viewer = null;
      render();
    });
  }

  const randomButton = document.querySelector("[data-random-recommend]");
  if (randomButton) {
    randomButton.addEventListener("click", () => {
      state.recommendations = getRandomRecommendations();
      state.selected = null;
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
    if (event.key === "Escape" && state.isHelpOpen) {
      state.isHelpOpen = false;
      render();
    }
  };

  if (input && !state.isHelpOpen) {
    input.focus();
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
      state.selected = state.results[Number(button.dataset.result)];
      render();
    });
  });

  document.querySelectorAll("[data-recommend-query]").forEach((button) => {
    button.addEventListener("click", () => {
      const query = button.dataset.recommendQuery;
      scheduleSearch(query);
    });
  });

  const refreshRecommendations = document.querySelector("[data-refresh-recommendations]");
  if (refreshRecommendations) {
    refreshRecommendations.addEventListener("click", () => {
      state.recommendations = getRandomRecommendations();
      render();
    });
  }

  const back = document.querySelector("[data-back]");
  if (back) {
    back.addEventListener("click", () => {
      state.selected = null;
      state.viewer = null;
      render();
    });
  }

  document.querySelectorAll("[data-info-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.infoMode = button.dataset.infoMode;
      render();
    });
  });

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
  const confidence = typeof atom.b === "number" ? Math.round(atom.b) : null;
  const description = describeResidue(residueName, element, confidence);
  const pane = document.querySelector(".viewer-pane");
  const paneRect = pane.getBoundingClientRect();
  const clientX = event?.clientX ?? paneRect.left + paneRect.width / 2;
  const clientY = event?.clientY ?? paneRect.top + paneRect.height / 2;
  const x = Math.min(Math.max(clientX - paneRect.left + 14, 12), paneRect.width - 250);
  const y = Math.min(Math.max(clientY - paneRect.top + 14, 12), paneRect.height - 148);

  tooltip.innerHTML = `
    <strong>${escapeHtml(residueName)} ${escapeHtml(residueNumber)}</strong>
    <span>체인 ${escapeHtml(chain)} · ${escapeHtml(element)} 원자${confidence === null ? "" : ` · 값 ${confidence}`}</span>
    <p>${escapeHtml(description)}</p>
  `;
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
  tooltip.classList.add("visible");

  window.clearTimeout(tooltip.hideTimer);
  tooltip.hideTimer = window.setTimeout(() => {
    tooltip.classList.remove("visible");
  }, 4200);
}

function describeResidue(residueName, element, confidence) {
  const residue = residueDescriptions[residueName?.toUpperCase()] || "이 위치는 단백질을 이루는 아미노산 잔기입니다.";
  const confidenceText =
    confidence === null
      ? ""
      : confidence >= 90
        ? " 이 값은 매우 높은 신뢰도 또는 낮은 유연성을 뜻할 수 있습니다."
        : confidence >= 70
          ? " 이 값은 대체로 안정적인 구간으로 볼 수 있습니다."
          : confidence >= 50
            ? " 이 값은 해석할 때 조심해서 봐야 하는 구간입니다."
            : " 이 값은 유연하거나 예측 신뢰도가 낮은 구간일 수 있습니다.";
  return `${residue} 클릭한 점은 ${element} 원자입니다.${confidenceText}`;
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
