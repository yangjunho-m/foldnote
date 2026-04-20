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
  proteinNameTranslations,
  proteins
} from "./catalog.js";

export async function findProteinStructures(query) {
  const curatedPdbIds = getCuratedPdbIds(query);
  let apiPdbIds = [];

  try {
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

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    apiPdbIds = (data.result_set || [])
      .map((item) => item.identifier)
      .filter(Boolean)
      .slice(0, 6);
  } catch (error) {
    if (!curatedPdbIds.length) {
      return fetchAlphaFoldResults(query);
    }
  }

  const pdbIds = mergeUniqueIds([...curatedPdbIds, ...apiPdbIds]).slice(0, 8);

  const results = pdbIds.length ? await fetchPdbDetails(pdbIds) : await fetchAlphaFoldResults(query);
  return groupRelatedStructures(
    results.map((protein) => addSearchContextMetadata(addLocalizedMetadata(protein), query)),
    query
  );
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, "");
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

  return addLocalizedMetadata({
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
  });
}

function createMinimalPdbProtein(pdbId) {
  return addLocalizedMetadata({
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
  });
}

function createProteinFromAlphaFold(record, structureUrl) {
  const accession = record.primaryAccession;
  const proteinName = getUniProtProteinName(record);
  const organism = record.organism?.scientificName || "정보 없음";
  const length = record.sequence?.length || record.length;
  const alphaFoldId = `AF-${accession}-F1`;

  return addLocalizedMetadata({
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
  });
}

function addLocalizedMetadata(protein) {
  const text = `${protein.name || ""} ${protein.englishName || ""}`;
  const match = proteinNameTranslations.find((item) => item.pattern.test(text));
  if (!match) return addGenericMetadata(protein);
  const state = match.family === "헤모글로빈" ? classifyHemoglobinState(protein, text) : null;

  return addGenericMetadata({
    ...protein,
    koreanName: state?.koreanName || protein.koreanName || match.koreanName,
    family: protein.family || match.family,
    stateLabel: state?.stateLabel || protein.stateLabel || match.stateLabel,
    stateReason: state?.stateReason || protein.stateReason || match.stateReason
  });
}

function addGenericMetadata(protein) {
  const family = protein.family || inferProteinFamily(protein);
  const state = inferGenericState(protein);
  return {
    ...protein,
    family,
    stateLabel: protein.stateLabel || state.stateLabel,
    stateReason: protein.stateReason || state.stateReason
  };
}

function addSearchContextMetadata(protein, query) {
  const searchTerm = resolveSearchTerm(query);
  const searchFamily = normalizeFamilyName(searchTerm);
  const structureId = String(getStructureId(protein) || "").toUpperCase();
  const text = `${searchTerm} ${protein.name || ""} ${protein.englishName || ""} ${structureId}`;

  if (/h[ae]moglobin/i.test(text)) {
    const state = classifyHemoglobinState(protein, text);
    return {
      ...protein,
      koreanName: protein.koreanName || state.koreanName,
      family: "헤모글로빈",
      stateLabel: state.stateLabel,
      stateReason: state.stateReason
    };
  }

  if (searchFamily && isWeakFamilyName(protein.family)) {
    return {
      ...protein,
      family: searchFamily
    };
  }

  return protein;
}

function isWeakFamilyName(family) {
  const value = normalizeFamilyName(family);
  return !value || /^pdb [0-9a-z]{4}$/.test(value) || value === "rcsb pdb entry";
}

function classifyHemoglobinState(protein, text) {
  const value = `${text} ${protein.pdbId || ""}`.toLowerCase();
  const id = String(protein.pdbId || "").toUpperCase();
  const facts = `${protein.method || "실험"} · ${protein.resolution || "해상도 정보 없음"}`;

  if (id === "4HHB") {
    return {
      koreanName: "헤모글로빈 A",
      stateLabel: "대표 성인형",
      stateReason: `성인에게 가장 흔한 표준 헤모글로빈입니다. 비결합형, 산소 결합형, 변이형을 비교할 때 기준점으로 쓰기 좋습니다. (${id})`
    };
  }

  if (id === "1HHO") {
    return {
      koreanName: "산소 결합 헤모글로빈",
      stateLabel: "산소 결합형",
      stateReason: `산소가 헴에 붙은 R 상태에 가까운 구조입니다. 산소가 붙으며 친화도가 높아지는 협동성 설명에 좋습니다. (${id})`
    };
  }

  if (id === "2HHB") {
    return {
      koreanName: "데옥시헤모글로빈",
      stateLabel: "비결합형",
      stateReason: `산소가 붙지 않은 T 상태 구조입니다. 산소 결합형과 비교하면 사슬 사이 배치와 헴 주변 위치가 달라집니다. (${id})`
    };
  }

  if (/2hhb|deoxy|unliganded|t-state|tense/.test(value)) {
    return {
      koreanName: "데옥시헤모글로빈",
      stateLabel: "비결합형",
      stateReason: `산소가 붙지 않은 T 상태 구조입니다. 산소 결합형과 비교하면 사슬 사이 배치와 헴 주변 위치가 달라집니다. (${id || facts})`
    };
  }

  if (/1hho|oxy|oxygenated|o2|liganded|r-state|relaxed/.test(value)) {
    return {
      koreanName: "산소 결합 헤모글로빈",
      stateLabel: "산소 결합형",
      stateReason: `산소가 헴에 붙은 R 상태에 가까운 구조입니다. 산소가 붙으며 친화도가 높아지는 협동성 설명에 좋습니다. (${id || facts})`
    };
  }

  if (/carbonmonoxy|carboxy|carbon monoxide|\bco\b|co-/.test(value)) {
    return {
      koreanName: "일산화탄소 결합 헤모글로빈",
      stateLabel: "CO 결합형",
      stateReason: `일산화탄소가 헴에 붙은 구조입니다. 산소보다 강하게 결합하는 이유와 중독 위험을 설명할 때 씁니다. (${id || facts})`
    };
  }

  if (/methemoglobin|met|ferric|aquomet|cyanomet/.test(value)) {
    return {
      koreanName: "메트헤모글로빈",
      stateLabel: "산화형",
      stateReason: `철이 산화되었거나 물/시안화물이 결합한 상태입니다. 산소 운반이 어려운 변형 상태를 비교할 때 좋습니다. (${id || facts})`
    };
  }

  if (/4hhb|adult|hemoglobin a|haemoglobin a/.test(value)) {
    return {
      koreanName: "헤모글로빈 A",
      stateLabel: "대표 성인형",
      stateReason: `성인에게 가장 흔한 표준 헤모글로빈입니다. 비결합형, 산소 결합형, 변이형을 비교할 때 기준점으로 쓰기 좋습니다. (${id || facts})`
    };
  }

  if (/fetal|hemoglobin f|haemoglobin f/.test(value)) {
    return {
      koreanName: "태아 헤모글로빈",
      stateLabel: "태아형",
      stateReason: `태아에서 산소를 더 잘 붙잡도록 사슬 조성이 다른 형태입니다. 성인형과 산소 친화도 차이를 비교합니다. (${id || facts})`
    };
  }

  if (/sickle|mutant|variant|mutation|hb s|hbs/.test(value)) {
    return {
      koreanName: "변이 헤모글로빈",
      stateLabel: "변이형",
      stateReason: `아미노산 변이 또는 질환 관련 구조입니다. 정상 성인형과 비교해 표면 전하와 사슬 접촉 차이를 봅니다. (${id || facts})`
    };
  }

  return {
    koreanName: "헤모글로빈",
    stateLabel: "실험 조건형",
    stateReason: `같은 헤모글로빈이지만 등록된 실험 조건, 결합 분자, 해상도가 다른 구조입니다. 먼저 대표 성인형과 비교해 무엇이 붙었는지 확인합니다. (${id || facts})`
  };
}

function groupRelatedStructures(results, query) {
  const filtered = results.filter(Boolean);
  if (filtered.length <= 1) return filtered;

  const searchTerm = resolveSearchTerm(query).toLowerCase();
  const groups = new Map();
  filtered.forEach((protein) => {
    const key = protein.family || inferProteinFamily(protein) || getStructureId(protein);
    const entries = groups.get(key) || [];
    entries.push(protein);
    groups.set(key, entries);
  });

  return Array.from(groups.values())
    .sort((a, b) => b.length - a.length)
    .slice(0, 4)
    .map((items) => {
      const representative = chooseRepresentative(items, searchTerm);
      const relatedStates = items
        .filter((item) => getStructureId(item) !== getStructureId(representative))
        .slice(0, 5)
        .map((item) => ({
          id: getStructureId(item),
          name: item.koreanName || item.name,
          englishName: item.englishName || item.name,
          stateLabel: item.stateLabel || "다른 후보",
          stateReason: describeDifferenceFromRepresentative(item, representative),
          method: item.method,
          resolution: item.resolution,
          source: item.source,
          protein: item
        }));

      return {
        ...representative,
        resultCount: items.length,
        relatedStates
      };
    });
}

function chooseRepresentative(items, searchTerm) {
  return [...items].sort((a, b) => scoreRepresentative(b, searchTerm) - scoreRepresentative(a, searchTerm))[0];
}

function scoreRepresentative(protein, searchTerm) {
  const text = `${protein.name || ""} ${protein.englishName || ""}`.toLowerCase();
  let score = 0;
  if (text.includes(searchTerm)) score += 5;
  if (/adult|hemoglobin a|haemoglobin a|representative/i.test(text)) score += 4;
  if (/transition state|inhibitor|tosyl|complex|mutant|variant|dimer/i.test(text)) score -= 2;
  if (/refined|crystal structure|structure of/i.test(text)) score += 2;
  if (protein.pdbId === "4HHB") score += 8;
  if (protein.pdbId === "1HHO") score += 5;
  if (protein.pdbId === "2HHB") score += 3;
  if (protein.source === "PDB") score += 1;
  const resolution = Number.parseFloat(protein.resolution);
  if (Number.isFinite(resolution)) score += Math.max(0, 3 - resolution);
  return score;
}

function getStructureId(protein) {
  return protein.pdbId || protein.accession || protein.alphaFoldId || protein.name;
}

function inferProteinFamily(protein) {
  const source = protein.koreanName || protein.name || protein.englishName || "";
  return normalizeFamilyName(source);
}

function normalizeFamilyName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\b(structure|crystal|crystalline|refined|atomic|resolution|of|the|a|an|at|and|complex|dimer|tetrahedral|transition|state|tosyl)\b/g, " ")
    .replace(/\b[0-9]+(\.[0-9]+)?\s*-?\s*(angstroms?|a)\b/g, " ")
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferGenericState(protein) {
  const text = `${protein.name || ""} ${protein.englishName || ""} ${protein.pdbId || ""}`.toLowerCase();
  const id = protein.pdbId || protein.accession || protein.alphaFoldId || "ID 없음";

  if (/transition state|tetrahedral/.test(text)) {
    return {
      stateLabel: "전이상태 복합체",
      stateReason: `반응 중간 상태를 흉내 낸 구조입니다. 대표 구조와 비교하면 활성 부위가 기질을 처리하는 순간을 이해하기 좋습니다. (${id})`
    };
  }
  if (/inhibitor|tosyl|ligand|bound|complex/.test(text)) {
    return {
      stateLabel: "결합형",
      stateReason: `억제제나 리간드가 결합한 구조입니다. 대표 구조와 비교하면 결합 부위와 기능 조절 위치가 드러납니다. (${id})`
    };
  }
  if (/dimer|trimer|tetramer|oligomer/.test(text)) {
    return {
      stateLabel: "올리고머형",
      stateReason: `여러 사슬이 함께 있는 구조입니다. 대표 단량체 구조와 비교하면 사슬 사이 접촉면과 조립 상태를 볼 수 있습니다. (${id})`
    };
  }
  if (/mutant|variant|mutation/.test(text)) {
    return {
      stateLabel: "변이형",
      stateReason: `아미노산이 바뀐 구조입니다. 대표 구조와 비교하면 변이가 접힘, 표면 전하, 결합 부위에 주는 영향을 볼 수 있습니다. (${id})`
    };
  }
  if (/apo|unbound|free|unliganded/.test(text)) {
    return {
      stateLabel: "비결합형",
      stateReason: `리간드나 기질이 없는 구조입니다. 결합형 구조와 나란히 보면 결합 전후 변화를 이해하기 쉽습니다. (${id})`
    };
  }
  if (/refined|high resolution|crystal structure|crystalline/.test(text)) {
    return {
      stateLabel: "정제 결정 구조",
      stateReason: `해상도와 원자 위치를 정밀하게 다듬은 기준 구조입니다. 다른 결합형이나 복합체 구조와 비교할 대표 후보로 적합합니다. (${id})`
    };
  }

  return {
    stateLabel: "실험 조건형",
    stateReason: `같은 단백질이지만 실험 조건, 해상도, 결합 분자, 사슬 조립 상태가 다를 수 있는 구조입니다. (${id})`
  };
}

function describeDifferenceFromRepresentative(candidate, representative) {
  const base = candidate.stateReason || inferGenericState(candidate).stateReason;
  const repId = representative.pdbId || representative.accession || representative.alphaFoldId || representative.name;
  return `${base} 대표 구조(${repId})와 비교해서 구조-기능 차이를 확인하세요.`;
}

function getCuratedPdbIds(query) {
  const searchTerm = resolveSearchTerm(query).toLowerCase();
  if (!/h[ae]moglobin/.test(searchTerm)) return [];
  return proteins
    .filter((protein) => /hemoglobin/i.test(`${protein.name} ${protein.englishName}`))
    .map((protein) => protein.pdbId)
    .filter(Boolean);
}

function mergeUniqueIds(ids) {
  const seen = new Set();
  return ids.filter((id) => {
    const key = String(id || "").toUpperCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
