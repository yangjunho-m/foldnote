const proteins = [
  {
    name: "헤모글로빈",
    englishName: "Hemoglobin",
    pdbId: "1HHO",
    source: "PDB",
    organism: "Homo sapiens",
    method: "X-ray",
    resolution: "1.74 A",
    size: "574 aa",
    mass: "~64.5 kDa",
    confidence: "실험 구조",
    description:
      "적혈구 안에서 산소를 붙잡아 폐에서 조직까지 옮기는 단백질입니다. 네 개의 사슬이 모여 있고, 각 사슬의 헴 그룹이 산소 결합의 핵심 역할을 합니다.",
    features: [
      ["blue", "기능", "산소를 운반하고 조직의 산소 농도에 따라 놓아줍니다."],
      ["purple", "구조", "알파 사슬 2개와 베타 사슬 2개가 모인 사량체입니다."],
      ["green", "볼 포인트", "산소가 하나 붙으면 다음 산소가 더 잘 붙는 협동성이 있습니다."],
      ["amber", "생활 연결", "빈혈, 일산화탄소 중독, 운동 능력과도 연결해서 설명할 수 있습니다."]
    ]
  },
  {
    name: "데옥시헤모글로빈",
    englishName: "Deoxyhemoglobin",
    pdbId: "2HHB",
    source: "PDB",
    organism: "Homo sapiens",
    method: "X-ray",
    resolution: "1.74 A",
    size: "574 aa",
    mass: "~64.5 kDa",
    confidence: "실험 구조",
    description:
      "산소가 결합하지 않은 헤모글로빈 상태입니다. 산소가 붙은 상태와 비교하면 사슬의 상대적 위치가 달라져 단백질이 상태에 따라 움직인다는 것을 보여줍니다.",
    features: [
      ["blue", "기능", "산소가 부족한 조직에서 산소를 내어준 뒤의 구조 상태입니다."],
      ["purple", "구조", "긴장 상태에 가까운 배치를 가지며 산소 결합 친화도가 낮습니다."],
      ["green", "볼 포인트", "산소 결합 전후 구조 변화를 비교하기 좋은 대표 예시입니다."],
      ["amber", "학습 연결", "단백질은 고정된 조각상이 아니라 환경에 따라 움직이는 기계에 가깝습니다."]
    ]
  },
  {
    name: "헤모글로빈 A",
    englishName: "Adult Hemoglobin",
    pdbId: "4HHB",
    source: "PDB",
    organism: "Homo sapiens",
    method: "X-ray",
    resolution: "1.90 A",
    size: "574 aa",
    mass: "~64.5 kDa",
    confidence: "실험 구조",
    description:
      "성인에게 가장 흔한 헤모글로빈 형태입니다. 산소 운반을 이해하는 표준 모델로 자주 쓰이며, 유전 변이와 혈액 질환 설명에도 좋습니다.",
    features: [
      ["blue", "기능", "폐에서 산소를 싣고 몸 전체 조직으로 배달합니다."],
      ["purple", "구조", "2개의 알파 사슬과 2개의 베타 사슬로 이루어집니다."],
      ["green", "볼 포인트", "겸상 적혈구 빈혈처럼 작은 아미노산 변화가 큰 결과를 만들 수 있습니다."],
      ["amber", "해설 아이디어", "정상 구조와 변이 구조를 나란히 비교하면 일반인도 차이를 빠르게 이해합니다."]
    ]
  },
  {
    name: "인슐린",
    englishName: "Insulin",
    pdbId: "4INS",
    source: "PDB",
    organism: "Homo sapiens",
    method: "X-ray",
    resolution: "1.50 A",
    size: "51 aa",
    mass: "~5.8 kDa",
    confidence: "실험 구조",
    description:
      "혈당을 낮추는 호르몬 단백질입니다. 작은 두 사슬이 이황화 결합으로 묶여 있으며, 당뇨병 치료제와 바로 연결되는 친숙한 구조입니다.",
    features: [
      ["blue", "기능", "세포가 포도당을 받아들이도록 신호를 보냅니다."],
      ["purple", "구조", "A 사슬과 B 사슬이 이황화 결합으로 안정화됩니다."],
      ["green", "볼 포인트", "작은 단백질이지만 생리 효과는 매우 큽니다."],
      ["amber", "생활 연결", "제형 변화가 작용 시간 차이를 만드는 과정을 설명하기 좋습니다."]
    ]
  }
];

const recommendedProteins = [
  {
    name: "헤모글로빈",
    query: "헤모글로빈",
    tag: "오늘의 추천",
    note: "산소 운반을 이해하기 좋은 대표 단백질"
  },
  {
    name: "인슐린",
    query: "인슐린",
    tag: "인기",
    note: "혈당 조절과 당뇨병을 연결해서 보기 좋습니다"
  },
  {
    name: "p53",
    query: "p53 tumor suppressor",
    tag: "암 연구",
    note: "DNA 손상 반응과 종양 억제 기능으로 유명합니다"
  },
  {
    name: "스파이크 단백질",
    query: "SARS-CoV-2 spike glycoprotein",
    tag: "바이러스",
    note: "바이러스가 세포에 붙는 과정을 설명하기 좋습니다"
  },
  {
    name: "GFP",
    query: "green fluorescent protein",
    tag: "형광",
    note: "생명과학 실험에서 표지 단백질로 널리 쓰입니다"
  },
  {
    name: "CRISPR Cas9",
    query: "Cas9",
    tag: "유전자 편집",
    note: "DNA를 인식하고 자르는 구조를 살펴볼 수 있습니다"
  },
  {
    name: "콜라겐",
    query: "collagen",
    tag: "구조 단백질",
    note: "피부와 결합조직의 강도를 만드는 섬유성 단백질"
  },
  {
    name: "라이소자임",
    query: "lysozyme",
    tag: "효소",
    note: "세균 세포벽을 분해하는 고전적인 구조 예시"
  }
];

const RCSB_SEARCH_URL = "https://search.rcsb.org/rcsbsearch/v2/query";
const RCSB_DATA_ENTRY_URL = "https://data.rcsb.org/rest/v1/core/entry";
const RCSB_DATA_POLYMER_ENTITY_URL = "https://data.rcsb.org/rest/v1/core/polymer_entity";
const RCSB_STRUCTURE_FILE_URL = "https://files.rcsb.org/download";
const UNIPROT_SEARCH_URL = "https://rest.uniprot.org/uniprotkb/search";
const ALPHAFOLD_FILE_URL = "https://alphafold.ebi.ac.uk/files";
const ALPHAFOLD_ENTRY_URL = "https://alphafold.ebi.ac.uk/entry";
const ALPHAFOLD_MODEL_VERSION = 6;

const koreanQueryMap = [
  ["헤모글로빈", "hemoglobin"],
  ["헤모", "hemoglobin"],
  ["헤", "hemoglobin"],
  ["인슐린", "insulin"],
  ["콜라겐", "collagen"],
  ["케라틴", "keratin"],
  ["미오글로빈", "myoglobin"],
  ["알부민", "albumin"],
  ["항체", "antibody"],
  ["아밀레이스", "amylase"],
  ["아밀라아제", "amylase"],
  ["카탈레이스", "catalase"],
  ["라이소자임", "lysozyme"],
  ["리소자임", "lysozyme"]
];

const fallbackProtein = (query) => ({
  name: query,
  englishName: "Predicted protein",
  source: "AlphaFold",
  organism: "입력 후 후보 선택 필요",
  method: "AI prediction",
  resolution: "예측 모델",
  size: "미확인",
  mass: "미확인",
  confidence: "pLDDT 확인 예정",
  description:
    "PDB 실험 구조 후보가 없을 때는 UniProt ID 또는 서열을 기준으로 AlphaFold 예측 구조를 연결하는 흐름이 좋습니다. 예측 구조는 신뢰도 색상과 함께 보여줘야 오해가 줄어듭니다.",
  features: [
    ["blue", "검색 흐름", "먼저 PDB 후보를 찾고, 없으면 AlphaFold DB 또는 직접 예측으로 넘어갑니다."],
    ["purple", "주의", "예측 구조는 실험으로 검증된 구조가 아니므로 신뢰도 점수를 함께 보여줘야 합니다."],
    ["green", "UX", "일반인에게는 '믿을 만한 부분'과 '조심해서 볼 부분'을 색으로 나누면 좋습니다."],
    ["amber", "다음 단계", "UniProt 자동완성, 생물종 필터, 구조 출처 표시를 붙이면 제품 완성도가 크게 올라갑니다."]
  ]
});

const icons = {
  database:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v14c0 1.7 3.1 3 7 3s7-1.3 7-3V5"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/></svg>',
  search:
    '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  info:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  sparkle:
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/></svg>'
};

const residueDescriptions = {
  ALA: "알라닌은 작은 소수성 아미노산이라 단백질 내부를 안정화하는 데 자주 쓰입니다.",
  ARG: "아르지닌은 양전하를 띠어 DNA, 인산기, 산성 잔기와 상호작용하기 쉽습니다.",
  ASN: "아스파라긴은 극성 잔기로 수소 결합을 만들 수 있습니다.",
  ASP: "아스파르트산은 음전하를 띠어 금속 이온이나 양전하 잔기와 상호작용할 수 있습니다.",
  CYS: "시스테인은 황을 포함하며 이황화 결합으로 구조를 단단히 고정할 수 있습니다.",
  GLN: "글루타민은 극성 잔기로 단백질 표면에서 수소 결합에 자주 참여합니다.",
  GLU: "글루탐산은 음전하를 띠는 산성 잔기입니다.",
  GLY: "글라이신은 가장 작은 아미노산이라 꺾임이나 유연한 부위에 자주 나타납니다.",
  HIS: "히스티딘은 pH 변화와 금속 결합에 민감해 활성 부위에서 자주 보입니다.",
  ILE: "아이소류신은 소수성 잔기로 단백질 내부 코어를 안정화합니다.",
  LEU: "류신은 소수성 잔기로 단백질 내부에서 접힘을 돕습니다.",
  LYS: "라이신은 양전하를 띠어 DNA나 산성 잔기와 상호작용하기 쉽습니다.",
  MET: "메티오닌은 황을 포함한 소수성 잔기이며 번역 시작 잔기로도 쓰입니다.",
  PHE: "페닐알라닌은 방향족 고리를 가진 소수성 잔기입니다.",
  PRO: "프롤린은 고리 구조 때문에 단백질 사슬의 방향을 꺾는 역할을 자주 합니다.",
  SER: "세린은 극성 잔기이며 인산화 같은 조절 위치가 될 수 있습니다.",
  THR: "트레오닌은 극성 잔기이며 인산화 조절에 참여할 수 있습니다.",
  TRP: "트립토판은 큰 방향족 잔기로 단백질 내부 안정화와 결합 부위에 자주 보입니다.",
  TYR: "타이로신은 방향족 잔기이며 인산화 신호 조절에도 중요합니다.",
  VAL: "발린은 소수성 잔기로 단백질 내부 코어 형성에 기여합니다.",
  HEM: "헴은 철을 포함한 보조인자로, 헤모글로빈에서는 산소 결합의 핵심입니다.",
  HOH: "물 분자입니다. 구조 안정화나 결합 부위 주변 상호작용에 관여할 수 있습니다."
};

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
  recommendations: [],
  theme: "light"
};

function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, "");
}

function searchProteins(query) {
  const value = normalize(query);
  if (!value) return [];

  const matches = proteins.filter((protein) => {
    const haystack = normalize(
      `${protein.name}${protein.englishName}${protein.pdbId || ""}${protein.organism}`
    );
    return haystack.includes(value) || value.includes("헤모") || value.includes("hemo");
  });

  return matches.length ? matches : [fallbackProtein(query)];
}

function resolveSearchTerm(query) {
  const compactQuery = normalize(query);
  const match = koreanQueryMap.find(([korean]) => compactQuery.includes(normalize(korean)));
  return match ? match[1] : query.trim();
}

function buildRcsbSearchPayload(query) {
  return {
    query: {
      type: "terminal",
      service: "full_text",
      parameters: {
        value: resolveSearchTerm(query)
      }
    },
    return_type: "entry",
    request_options: {
      paginate: {
        start: 0,
        rows: 8
      },
      results_content_type: ["experimental"],
      scoring_strategy: "combined",
      sort: [
        {
          sort_by: "score",
          direction: "desc"
        }
      ]
    }
  };
}

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
    const response = await fetch(RCSB_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildRcsbSearchPayload(trimmedQuery))
    });

    if (!response.ok) {
      throw new Error(`RCSB 검색 요청 실패 (${response.status})`);
    }

    const data = await response.json();
    const pdbIds = (data.result_set || [])
      .map((item) => item.identifier)
      .filter(Boolean)
      .slice(0, 6);

    const results = pdbIds.length ? await fetchPdbDetails(pdbIds) : await fetchAlphaFoldResults(trimmedQuery);

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

async function fetchAlphaFoldResults(query) {
  const searchTerm = resolveSearchTerm(query);
  const params = new URLSearchParams({
    query: `${searchTerm} reviewed:true`,
    format: "json",
    size: "6",
    fields: "accession,protein_name,organism_name,length"
  });

  const response = await fetch(`${UNIPROT_SEARCH_URL}?${params}`);
  if (!response.ok) throw new Error(`UniProt 검색 요청 실패 (${response.status})`);

  const data = await response.json();
  const candidates = data.results || [];
  const checked = await Promise.all(
    candidates.map(async (record) => {
      const accession = record.primaryAccession;
      const structureUrl = buildAlphaFoldStructureUrl(accession);
      try {
        const response = await fetch(structureUrl, { method: "HEAD" });
        return response.ok ? createProteinFromAlphaFold(record, structureUrl) : null;
      } catch (error) {
        return createProteinFromAlphaFold(record, structureUrl);
      }
    })
  );

  return checked.filter(Boolean);
}

async function fetchPdbDetails(pdbIds) {
  const details = await Promise.all(
    pdbIds.map(async (pdbId) => {
      try {
        const entry = await fetchJson(`${RCSB_DATA_ENTRY_URL}/${pdbId}`);
        const entityId = entry?.rcsb_entry_container_identifiers?.polymer_entity_ids?.[0];
        const entity = entityId
          ? await fetchJson(`${RCSB_DATA_POLYMER_ENTITY_URL}/${pdbId}/${entityId}`)
          : null;
        return createProteinFromRcsb(pdbId, entry, entity);
      } catch (error) {
        return createMinimalPdbProtein(pdbId);
      }
    })
  );

  return details;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Data API 요청 실패 (${response.status})`);
  return response.json();
}

function createProteinFromRcsb(pdbId, entry, entity) {
  const entityName = entity?.rcsb_polymer_entity?.pdbx_description;
  const title = entry?.struct?.title || `${pdbId} structure`;
  const organism = entity?.rcsb_entity_source_organism?.[0]?.scientific_name || "정보 없음";
  const method = entry?.exptl?.[0]?.method || "실험 정보 없음";
  const resolutionValue = entry?.rcsb_entry_info?.resolution_combined?.[0];
  const sequenceLength = entity?.entity_poly?.rcsb_sample_sequence_length;
  const formulaWeight = entity?.rcsb_polymer_entity?.formula_weight;
  const displayName = entityName || title;

  return {
    name: toTitleCase(displayName),
    englishName: title,
    pdbId,
    source: "PDB",
    organism,
    method,
    resolution: resolutionValue ? `${resolutionValue} A` : "정보 없음",
    size: sequenceLength ? `${sequenceLength} aa` : "정보 없음",
    mass: formulaWeight ? `~${Math.round(formulaWeight / 1000)} kDa` : "정보 없음",
    externalUrl: `https://www.rcsb.org/structure/${pdbId}`,
    structureUrl: `${RCSB_STRUCTURE_FILE_URL}/${pdbId}.cif`,
    pdbDownloadUrl: `${RCSB_STRUCTURE_FILE_URL}/${pdbId}.pdb`,
    cifDownloadUrl: `${RCSB_STRUCTURE_FILE_URL}/${pdbId}.cif`,
    confidence: "실험으로 결정된 구조라서 전체 접힘과 원자 배치를 비교적 직접적으로 해석할 수 있습니다",
    description: `${title} 구조입니다. ${organism}에서 유래한 단백질 또는 단백질 복합체로, 입체 구조를 통해 사슬의 접힘, 결합 부위, 보조인자나 리간드의 위치를 함께 살펴볼 수 있습니다.`,
    features: [
      ["blue", "구조", `${method}으로 관찰된 단백질 구조입니다.`],
      ["purple", "생물학적 맥락", `${organism}에서 보고된 구조입니다.`],
      ["green", "관찰 포인트", "리본의 접힘 방향, 작은 분자 결합 위치, 사슬 사이 접촉면을 함께 보면 좋습니다."],
      ["amber", "해석 주의", "한 구조는 특정 실험 조건의 모습이므로 실제 세포 안에서는 다른 상태도 존재할 수 있습니다."]
    ]
  };
}

function createMinimalPdbProtein(pdbId) {
  return {
    name: `PDB ${pdbId}`,
    englishName: "RCSB PDB entry",
    pdbId,
    source: "PDB",
    organism: "정보 로딩 실패",
    method: "정보 없음",
    resolution: "정보 없음",
    size: "정보 없음",
    mass: "정보 없음",
    externalUrl: `https://www.rcsb.org/structure/${pdbId}`,
    structureUrl: `${RCSB_STRUCTURE_FILE_URL}/${pdbId}.cif`,
    pdbDownloadUrl: `${RCSB_STRUCTURE_FILE_URL}/${pdbId}.pdb`,
    cifDownloadUrl: `${RCSB_STRUCTURE_FILE_URL}/${pdbId}.cif`,
    confidence: "실험 구조 후보이지만 일부 상세 정보는 표시되지 않았습니다",
    description: `${pdbId} 구조입니다. 상세 주석은 제한적이지만, 3D 구조에서는 단백질의 전체 접힘과 사슬 배치를 직접 확인할 수 있습니다.`,
    features: [
      ["blue", "구조", "단백질의 전체적인 접힘과 사슬 구성을 볼 수 있습니다."],
      ["purple", "관찰 포인트", "리간드나 금속 이온이 있다면 활성 부위 주변을 먼저 살펴보세요."],
      ["green", "비교", "비슷한 단백질의 다른 구조와 비교하면 움직임이나 결합 차이를 이해하기 쉽습니다."],
      ["amber", "해석 주의", "표시된 구조가 단백질의 모든 상태를 대표하지는 않을 수 있습니다."]
    ]
  };
}

function createProteinFromAlphaFold(record, structureUrl) {
  const accession = record.primaryAccession;
  const proteinName = getUniProtProteinName(record);
  const organism = record.organism?.scientificName || "정보 없음";
  const length = record.sequence?.length || record.length;
  const alphaFoldId = `AF-${accession}-F1`;

  return {
    name: proteinName,
    englishName: `${accession} AlphaFold predicted model`,
    pdbId: "",
    accession,
    alphaFoldId,
    source: "AlphaFold",
    organism,
    method: "AI prediction",
    resolution: "예측 모델",
    size: length ? `${length} aa` : "정보 없음",
    mass: "UniProt 기반",
    externalUrl: `${ALPHAFOLD_ENTRY_URL}/${accession}`,
    structureUrl,
    pdbDownloadUrl: structureUrl.replace(".cif", ".pdb"),
    cifDownloadUrl: structureUrl,
    confidence: "AlphaFold 예측 구조입니다. pLDDT가 높은 구간은 국소 접힘을 더 신뢰할 수 있고, 낮은 구간은 유연하거나 불확실할 수 있습니다.",
    description:
      `${proteinName}의 예측 구조입니다. ${organism} 단백질로, 전체 접힘의 윤곽과 도메인 배치를 살펴보는 데 유용합니다. 다만 결합 상태나 복합체 형성은 별도 근거와 함께 해석하는 편이 좋습니다.`,
    features: [
      ["blue", "구조", "단일 사슬의 접힘과 도메인 배치를 이해하는 데 적합합니다."],
      ["purple", "신뢰도", "pLDDT가 높을수록 해당 잔기 주변의 국소 구조를 더 신뢰할 수 있습니다."],
      ["green", "생물종", organism],
      ["amber", "주의", "예측 구조는 실험 구조가 아니므로 결합 부위, 유연한 영역, 복합체 해석에는 주의가 필요합니다."]
    ]
  };
}

function buildAlphaFoldStructureUrl(accession) {
  return `${ALPHAFOLD_FILE_URL}/AF-${accession}-F1-model_v${ALPHAFOLD_MODEL_VERSION}.cif`;
}

function getUniProtProteinName(record) {
  return (
    record.proteinDescription?.recommendedName?.fullName?.value ||
    record.proteinDescription?.submissionNames?.[0]?.fullName?.value ||
    record.proteinDescription?.alternativeNames?.[0]?.fullName?.value ||
    record.primaryAccession
  );
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

function toTitleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
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
      <button class="help-float" type="button" aria-label="도움말">?</button>
    </div>
  `;

  bindEvents();
  if (state.selected) initProteinViewer(state.selected);
}

function renderTopbar() {
  return `
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">${icons.database}</div>
        <div>
          <h1 class="brand-title">FoldNote <span>폴드노트</span></h1>
          <p class="brand-subtitle">단백질 구조를 쉽게 읽는 노트</p>
        </div>
      </div>
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
          <p>단백질 이름이나 PDB ID를 입력하면 구조와 상세 정보를 확인할 수 있습니다</p>
        </div>

        <form class="search-form" data-search-form>
          <span class="search-symbol" aria-hidden="true">${icons.search}</span>
          <input
            class="search-input"
            data-search-input
            type="search"
            value="${escapeHtml(state.query)}"
            placeholder="예: 헤모글로빈, 인슐린, 1HHO..."
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
            </div>
          </button>
        `
        )
        .join("")}
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
          <li>PDB에 없는 단백질은 AlphaFold 예측 구조를 제공합니다</li>
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
          <button class="back-button" type="button" data-back>← 검색으로 돌아가기</button>
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
          <button class="glass-button fit-button" type="button" data-view-reset title="구조 전체를 화면 중앙에 맞춤">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 3H3v5"/><path d="M16 3h5v5"/><path d="M21 16v5h-5"/><path d="M3 16v5h5"/><path d="M9 9h6v6H9z"/></svg>
            전체 보기
          </button>
        </div>
        ${renderColorLegend(protein)}
        <div class="viewer-toast" data-viewer-toast></div>
        <div class="atom-tooltip" data-atom-tooltip></div>
      </div>
      <aside class="info-panel">
        <div class="info-inner">
          <div class="protein-heading">
            <h2>${escapeHtml(protein.name)}</h2>
            ${badge(protein)}
          </div>
          <p class="brand-subtitle">${escapeHtml(protein.englishName)}</p>

          <div class="meta-grid">
            <div class="metric"><span>${protein.source === "PDB" ? "PDB ID" : "UniProt"}</span><strong>${protein.pdbId || protein.accession || "AlphaFold"}</strong></div>
            <div class="metric"><span>생물종</span><strong>${escapeHtml(protein.organism)}</strong></div>
            <div class="metric"><span>방법</span><strong>${escapeHtml(protein.method)}</strong></div>
            <div class="metric"><span>해상도</span><strong>${escapeHtml(protein.resolution)}</strong></div>
            <div class="metric"><span>크기</span><strong>${escapeHtml(protein.size)}</strong></div>
            <div class="metric"><span>분자량</span><strong>${escapeHtml(protein.mass)}</strong></div>
          </div>

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

          <section class="section compact-section">
            <h3>연구자 도구</h3>
            <div class="tool-grid">
              <button class="secondary-button" type="button" data-copy-id="${escapeHtml(protein.pdbId || protein.accession || "")}">ID 복사</button>
              <a class="secondary-button link-button" href="${escapeHtml(protein.cifDownloadUrl)}" target="_blank" rel="noreferrer">mmCIF</a>
              <a class="secondary-button link-button" href="${escapeHtml(protein.pdbDownloadUrl)}" target="_blank" rel="noreferrer">PDB 파일</a>
              <button class="secondary-button" type="button" data-view-style="confidence">신뢰도 색상</button>
            </div>
          </section>

          <div class="action-row">
            <a class="primary-button link-button" href="${escapeHtml(protein.externalUrl)}" target="_blank" rel="noreferrer">${protein.source === "PDB" ? "PDB에서 보기" : "AlphaFold 보기"}</a>
            <button class="secondary-button" type="button">해설 저장</button>
          </div>
        </div>
      </aside>
    </section>
  `;
}

function renderColorLegend(protein) {
  if (state.viewerStyle === "confidence") {
    return `
      <div class="viewer-legend">
        <h3>색상 의미</h3>
        <div><span style="background:#1f5eff"></span>매우 높음: 신뢰도 90+</div>
        <div><span style="background:#19a7ce"></span>높음: 70-90</div>
        <div><span style="background:#f2c94c"></span>낮음: 50-70</div>
        <div><span style="background:#f97316"></span>매우 낮음: 50 미만</div>
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
      <div><span style="background:#58c4dd"></span>리본: 단백질 골격</div>
      <div><span style="background:#4ade80"></span>스틱: 리간드/작은 분자</div>
      <p>${protein.source === "AlphaFold" ? "신뢰도 버튼을 누르면 pLDDT 색상으로 바뀝니다." : "신뢰도 버튼은 B-factor 값을 기준으로 색을 입힙니다."}</p>
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

  if (input) {
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

  const reset = document.querySelector("[data-view-reset]");
  if (reset) {
    reset.addEventListener("click", () => {
      if (!state.viewer) return;
      state.viewer.zoomTo();
      state.viewer.center();
      state.viewer.render();
      showViewerToast("구조를 화면 중앙에 맞췄습니다");
    });
  }

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

function showViewerToast(message) {
  const toast = document.querySelector("[data-viewer-toast]");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toast.hideTimer);
  toast.hideTimer = window.setTimeout(() => {
    toast.classList.remove("visible");
  }, 1400);
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
