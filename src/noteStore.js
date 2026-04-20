const STORAGE_KEY = "foldnote.savedProteinNotes.v1";

export function loadNotes() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveNote(protein, evidence) {
  const notes = loadNotes();
  const now = new Date().toISOString();
  const id = getProteinKey(protein);
  const nextNote = {
    id,
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
    summary: evidence?.summary?.slice(0, 3) || []
  };

  const withoutExisting = notes.filter((note) => note.id !== id);
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

export function getProteinKey(protein) {
  return protein.pdbId || protein.accession || protein.englishName || protein.name;
}
