import {
  ALPHAFOLD_ENTRY_URL,
  ALPHAFOLD_FILE_URL,
  ALPHAFOLD_MODEL_VERSION,
  RCSB_DATA_ENTRY_URL,
  RCSB_DATA_POLYMER_ENTITY_URL,
  RCSB_SEARCH_URL,
  RCSB_STRUCTURE_FILE_URL,
  UNIPROT_SEARCH_URL,
  fallbackProtein,
  koreanQueryMap,
  proteins
} from "./catalog.js";

export async function findProteinStructures(query) {
  const response = await fetch(RCSB_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildRcsbSearchPayload(query))
  });

  if (!response.ok) {
    throw new Error(`RCSB 검색 요청 실패 (${response.status})`);
  }

  const data = await response.json();
  const pdbIds = (data.result_set || [])
    .map((item) => item.identifier)
    .filter(Boolean)
    .slice(0, 6);

  return pdbIds.length ? fetchPdbDetails(pdbIds) : fetchAlphaFoldResults(query);
}

function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, "");
}

export function searchProteins(query) {
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

export function resolveSearchTerm(query) {
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
    quickSummary: makeQuickSummary(displayName, organism, method),
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
    quickSummary: "PDB에 등록된 실험 구조 후보입니다. 전체 접힘, 사슬 배치, 결합 부위를 빠르게 확인할 수 있습니다.",
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
    quickSummary: `${proteinName}의 예측 구조입니다. 전체 접힘과 도메인 배치를 먼저 이해하는 데 유용합니다.`,
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

function toTitleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function makeQuickSummary(name, organism, method) {
  const lowerName = String(name || "").toLowerCase();
  const known = [
    [/hemoglobin|haemoglobin/, "산소를 운반하는 혈액 단백질로, 헴 주변의 결합 구조가 핵심입니다."],
    [/insulin/, "혈당 조절 신호를 전달하는 작은 호르몬 단백질입니다."],
    [/p53|tumor protein p53/, "DNA 손상 반응과 세포주기 조절에 관여하는 종양 억제 단백질입니다."],
    [/spike|glycoprotein/, "세포 표면 수용체와 결합해 감염이나 인식 과정에 관여하는 표면 단백질입니다."],
    [/collagen/, "조직의 강도와 탄성을 만드는 긴 섬유성 구조 단백질입니다."],
    [/lysozyme/, "세균 세포벽을 분해하는 효소로 결합 부위 구조를 보기 좋습니다."],
    [/kinase/, "인산기를 붙여 세포 신호를 조절하는 효소 계열 단백질입니다."],
    [/receptor/, "세포 안팎의 신호를 인식하고 전달하는 수용체 단백질입니다."],
    [/antibody|immunoglobulin/, "항원을 인식해 면역 반응을 돕는 항체 단백질입니다."],
    [/polymerase/, "DNA나 RNA 사슬을 합성하는 효소입니다."]
  ];
  const match = known.find(([pattern]) => pattern.test(lowerName));
  if (match) return match[1];
  return `${organism}에서 보고된 ${method} 구조입니다. 단백질의 접힘, 결합 부위, 상호작용 위치를 빠르게 파악할 수 있습니다.`;
}
