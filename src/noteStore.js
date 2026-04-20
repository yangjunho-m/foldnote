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
    return Array.isArray(parsed) ? parsed : [];
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
  const nextRecent = [item, ...loadRecentProteins().filter((recent) => recent.id !== id)].slice(0, 8);
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(nextRecent));
  return nextRecent;
}

export function getProteinKey(protein) {
  return protein.pdbId || protein.accession || protein.englishName || protein.name;
}

export { DEFAULT_PROJECT_ID };
