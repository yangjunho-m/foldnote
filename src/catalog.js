export const proteins = [
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

export const recommendedProteins = [
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

export const RCSB_SEARCH_URL = "https://search.rcsb.org/rcsbsearch/v2/query";
export const RCSB_DATA_ENTRY_URL = "https://data.rcsb.org/rest/v1/core/entry";
export const RCSB_DATA_POLYMER_ENTITY_URL = "https://data.rcsb.org/rest/v1/core/polymer_entity";
export const RCSB_STRUCTURE_FILE_URL = "https://files.rcsb.org/download";
export const UNIPROT_SEARCH_URL = "https://rest.uniprot.org/uniprotkb/search";
export const ALPHAFOLD_FILE_URL = "https://alphafold.ebi.ac.uk/files";
export const ALPHAFOLD_ENTRY_URL = "https://alphafold.ebi.ac.uk/entry";
export const ALPHAFOLD_MODEL_VERSION = 6;

export const koreanQueryMap = [
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

export const fallbackProtein = (query) => ({
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

export const icons = {
  database:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v14c0 1.7 3.1 3 7 3s7-1.3 7-3V5"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/></svg>',
  search:
    '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  info:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  sparkle:
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/></svg>'
};

export const residueDescriptions = {
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
