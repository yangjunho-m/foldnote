const STORAGE_KEY = "foldnote.savedProteinNotes.v1";
const PROJECT_KEY = "foldnote.projects.v1";
const RECENT_KEY = "foldnote.recentProteins.v1";
const DEFAULT_PROJECT_ID = "default";

export function loadNotes() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadProjects() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PROJECT_KEY) || "[]");
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    // fall through to default project
  }
  return [{ id: DEFAULT_PROJECT_ID, name: "내 구조 노트", createdAt: new Date().toISOString() }];
}

export function createProject(name) {
  const projects = loadProjects();
  const trimmedName = String(name || "").trim();
  if (!trimmedName) return projects;
  const project = {
    id: `project-${Date.now()}`,
    name: trimmedName.slice(0, 40),
    createdAt: new Date().toISOString()
  };
  const nextProjects = [...projects, project].slice(0, 12);
  window.localStorage.setItem(PROJECT_KEY, JSON.stringify(nextProjects));
  return nextProjects;
}

export function saveNote(protein, evidence, projectId = DEFAULT_PROJECT_ID, snapshot = "") {
  const notes = loadNotes();
  const now = new Date().toISOString();
  const id = getProteinKey(protein);
  const insights = buildStructureInsights(protein, evidence);
  const nextNote = {
    id,
    projectId,
    savedAt: now,
    name: protein.name,
    englishName: protein.englishName,
    source: protein.source,
    structureId: protein.pdbId || protein.accession || "AlphaFold",
    organism: protein.organism,
    method: protein.method,
    resolution: protein.resolution,
    description: protein.description,
    externalUrl: protein.externalUrl,
    stateLabel: protein.stateLabel,
    stateReason: protein.stateReason,
    representativeReason: protein.representativeReason,
    noteSummary: insights.noteSummary,
    inspectionPoints: insights.inspectionPoints,
    nextActions: insights.nextActions,
    literatureCount: evidence?.articles?.length || 0,
    summary: evidence?.summary?.slice(0, 3) || [],
    claims: evidence?.claims?.slice(0, 3) || [],
    snapshot
  };

  const withoutExisting = notes.filter((note) => !(note.id === id && note.projectId === projectId));
  const nextNotes = [nextNote, ...withoutExisting].slice(0, 24);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextNotes));
  return nextNotes;
}

export function deleteNote(id) {
  const nextNotes = loadNotes().filter((note) => note.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextNotes));
  return nextNotes;
}

export function isSaved(protein, notes = loadNotes()) {
  return notes.some((note) => note.id === getProteinKey(protein));
}

export function loadRecentProteins() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function recordRecentProtein(protein) {
  const id = getProteinKey(protein);
  const item = {
    id,
    name: protein.name,
    englishName: protein.englishName,
    structureId: protein.pdbId || protein.accession || "AlphaFold",
    source: protein.source,
    viewedAt: new Date().toISOString()
  };
  const nextRecent = [item, ...loadRecentProteins().filter((recent) => recent.id !== id)].slice(0, 5);
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(nextRecent));
  return nextRecent;
}

export function getProteinKey(protein) {
  return protein.pdbId || protein.accession || protein.englishName || protein.name;
}

function buildStructureInsights(protein, evidence) {
  const evidenceCount = evidence?.articles?.length || 0;
  const claimCount = evidence?.claims?.length || 0;
  const summary = protein.quickSummary || protein.description || `${protein.name} 구조 노트입니다.`;
  const inspectionPoints = [
    protein.stateReason || protein.representativeReason || "",
    ...(protein.features || []).map((feature) => feature?.[2]).filter(Boolean)
  ].slice(0, 4);
  const nextActions = [
    "구조 비교에서 대표 후보와 다른 상태를 확인",
    evidenceCount ? `참고문헌 ${evidenceCount}개와 근거 문장 ${claimCount}개 검토` : "참고문헌 근거가 준비되면 다시 저장",
    "필요한 변이가 있으면 변이 해석에 입력",
    "보고서 생성으로 PDF/Markdown 초안 만들기"
  ];

  return {
    noteSummary: summary,
    inspectionPoints,
    nextActions
  };
}

export { DEFAULT_PROJECT_ID };
