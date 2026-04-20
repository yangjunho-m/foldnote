const EUROPE_PMC_SEARCH_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";

const RELATION_PATTERNS = [
  { label: "DNA", pattern: /\b(DNA|genome|promoter|chromatin|nucleotide)\b/gi },
  { label: "RNA", pattern: /\b(RNA|mRNA|miRNA|transcript|ribosome)\b/gi },
  { label: "단백질", pattern: /\b(receptor|enzyme|kinase|antibody|domain|complex|subunit|ligand)\b/gi },
  { label: "기능", pattern: /\b(binding|activation|inhibition|transport|signaling|catalysis|regulation)\b/gi }
];

const SUMMARY_TERMS = [
  "function",
  "structure",
  "binding",
  "complex",
  "domain",
  "interaction",
  "activity",
  "regulation",
  "dna",
  "rna",
  "receptor",
  "ligand"
];

export async function fetchLiteratureEvidence(protein) {
  const query = buildLiteratureQuery(protein);
  const params = new URLSearchParams({
    query,
    format: "json",
    resultType: "core",
    pageSize: "8",
    sort: "CITED desc"
  });

  const response = await fetch(`${EUROPE_PMC_SEARCH_URL}?${params}`);
  if (!response.ok) {
    throw new Error(`Europe PMC 요청 실패 (${response.status})`);
  }

  const data = await response.json();
  const articles = (data.resultList?.result || [])
    .map(normalizeArticle)
    .filter((article) => article.title && article.abstractText)
    .slice(0, 6);

  return {
    query,
    articles,
    summary: summarizeArticles(articles, protein),
    claims: buildEvidenceClaims(articles, protein),
    relatedEntities: findRelatedEntities(articles)
  };
}

function buildLiteratureQuery(protein) {
  const terms = [
    protein.pdbId,
    protein.accession,
    protein.name,
    protein.englishName?.replace(/\([^)]*\)/g, "").trim()
  ]
    .filter(Boolean)
    .map((term) => term.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim())
    .filter((term) => term.length > 1);

  const uniqueTerms = [...new Set(terms)].slice(0, 3);
  const coreQuery = uniqueTerms.map((term) => `"${term}"`).join(" OR ");
  return `(${coreQuery}) AND (protein OR structure OR function)`;
}

function normalizeArticle(article) {
  const id = article.pmid || article.pmcid || article.doi || article.id;
  return {
    id,
    title: cleanText(article.title),
    abstractText: cleanText(article.abstractText),
    authors: cleanText(article.authorString || "저자 정보 없음"),
    journal: cleanText(article.journalTitle || article.bookOrReportDetails || "저널 정보 없음"),
    year: article.pubYear || "연도 없음",
    citedByCount: Number(article.citedByCount || 0),
    url: article.doi
      ? `https://doi.org/${article.doi}`
      : `https://europepmc.org/article/${article.source || "MED"}/${id}`
  };
}

function summarizeArticles(articles, protein) {
  if (!articles.length) {
    return [
      "관련 초록을 찾지 못했습니다. 단백질 영문명, UniProt accession, PDB ID로 다시 검색하면 근거가 더 잘 잡힙니다."
    ];
  }

  const proteinTerms = [protein.name, protein.englishName, protein.pdbId, protein.accession]
    .filter(Boolean)
    .flatMap((term) => String(term).toLowerCase().split(/[^a-z0-9]+/))
    .filter((term) => term.length > 2);

  const rankedSentences = articles
    .flatMap((article) =>
      splitSentences(article.abstractText).map((sentence) => ({
        sentence,
        score: scoreSentence(sentence, proteinTerms),
        source: article
      }))
    )
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (!rankedSentences.length) {
    return [
      `${articles.length}개의 관련 초록을 찾았습니다. 참고문헌 목록에서 구조, 기능, 상호작용 단서를 확인할 수 있습니다.`
    ];
  }

  return rankedSentences.map(
    ({ sentence, source }) => `${sentence} (${source.year}, ${source.journal})`
  );
}

function buildEvidenceClaims(articles, protein) {
  if (!articles.length) return [];

  const proteinTerms = [protein.name, protein.englishName, protein.pdbId, protein.accession]
    .filter(Boolean)
    .flatMap((term) => String(term).toLowerCase().split(/[^a-z0-9]+/))
    .filter((term) => term.length > 2);

  return articles
    .flatMap((article) =>
      splitSentences(article.abstractText).map((sentence) => ({
        sentence,
        score: scoreSentence(sentence, proteinTerms),
        sourceTitle: article.title,
        sourceUrl: article.url,
        journal: article.journal,
        year: article.year
      }))
    )
    .filter((claim) => claim.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function scoreSentence(sentence, proteinTerms) {
  const lower = sentence.toLowerCase();
  const summaryScore = SUMMARY_TERMS.reduce((score, term) => score + (lower.includes(term) ? 2 : 0), 0);
  const proteinScore = proteinTerms.reduce((score, term) => score + (lower.includes(term) ? 3 : 0), 0);
  const lengthScore = sentence.length > 80 && sentence.length < 260 ? 1 : 0;
  return summaryScore + proteinScore + lengthScore;
}

function findRelatedEntities(articles) {
  const corpus = articles.map((article) => `${article.title} ${article.abstractText}`).join(" ");
  const relations = RELATION_PATTERNS.map(({ label, pattern }) => ({
    label,
    count: [...corpus.matchAll(pattern)].length
  })).filter((item) => item.count > 0);

  const symbols = [...corpus.matchAll(/\b[A-Z0-9]{2,8}\b/g)]
    .map(([symbol]) => symbol)
    .filter((symbol) => !["DNA", "RNA", "PDB", "PMID", "ATP", "THE", "AND"].includes(symbol))
    .reduce((counts, symbol) => counts.set(symbol, (counts.get(symbol) || 0) + 1), new Map());

  const topSymbols = [...symbols.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([symbol, count]) => ({ label: symbol, count }));

  return [...relations, ...topSymbols].slice(0, 12);
}

function splitSentences(text) {
  return cleanText(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 40);
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
