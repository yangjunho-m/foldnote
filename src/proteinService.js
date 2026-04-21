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
  return markRepresentativeResult(
    results.map((protein) => addSearchContextMetadata(addLocalizedMetadata(protein), query))
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

function markRepresentativeResult(results) {
  if (!results.length) return results;

  return results.map((item, index) => ({
    ...item,
    isRepresentative: index === 0,
    representativeReason:
      index === 0
        ? "검색 결과에서 가장 먼저 확인하기 좋은 추천 구조입니다."
        : item.representativeReason
  }));
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Data API 요청 실패 (${response.status})`);
  return response.json();
}

function createProteinFromRcsb(pdbId, entry, entity) {
  const entityName = entity?.rcsb_polymer_entity?.pdbx_description;
  const title = entry?.struct?.title || `${pdbId} structure`;
  const organism = entity?.rcsb_entity_source_organism?.[0]?.scientific_name || "";
  const method = entry?.exptl?.[0]?.method || "";
  const resolutionValue = entry?.rcsb_entry_info?.resolution_combined?.[0];
  const sequenceLength = entity?.entity_poly?.rcsb_sample_sequence_length;
  const formulaWeight = entity?.rcsb_polymer_entity?.formula_weight;
  const displayName = entityName || title;
  const interpreted = interpretStructureText(displayName, title, organism, method, resolutionValue, pdbId);

  return addLocalizedMetadata({
    name: toTitleCase(displayName),
    englishName: title,
    pdbId,
    source: "PDB",
    organism,
    method,
    resolution: resolutionValue ? `${resolutionValue} A` : "",
    size: sequenceLength ? `${sequenceLength} aa` : "",
    mass: formulaWeight ? `~${Math.round(formulaWeight / 1000)} kDa` : "",
    externalUrl: `https://www.rcsb.org/structure/${pdbId}`,
    structureUrl: `${RCSB_STRUCTURE_FILE_URL}/${pdbId}.cif`,
    pdbDownloadUrl: `${RCSB_STRUCTURE_FILE_URL}/${pdbId}.pdb`,
    cifDownloadUrl: `${RCSB_STRUCTURE_FILE_URL}/${pdbId}.cif`,
    confidence: "실험으로 결정된 구조라서 전체 접힘과 원자 배치를 비교적 직접적으로 해석할 수 있습니다",
    quickSummary: interpreted.summary,
    description: interpreted.description,
    features: [
      ["blue", "구조", interpreted.structurePoint],
      ["purple", "생물학적 맥락", interpreted.context],
      ["green", "관찰 포인트", interpreted.inspectPoint],
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
    organism: "",
    method: "",
    resolution: "",
    size: "",
    mass: "",
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
      ["amber", "해석 주의", "표시된 구조가 단백질의 모든 상태를 보여주지는 않을 수 있습니다."]
    ]
  });
}

function createProteinFromAlphaFold(record, structureUrl) {
  const accession = record.primaryAccession;
  const proteinName = getUniProtProteinName(record);
  const organism = record.organism?.scientificName || "";
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
    size: length ? `${length} aa` : "",
    mass: "UniProt 기반",
    externalUrl: `${ALPHAFOLD_ENTRY_URL}/${accession}`,
    structureUrl,
    pdbDownloadUrl: structureUrl.replace(".cif", ".pdb"),
    cifDownloadUrl: structureUrl,
    confidence: "AlphaFold 예측 구조입니다. pLDDT가 높은 구간은 국소 접힘을 더 신뢰할 수 있고, 낮은 구간은 유연하거나 불확실할 수 있습니다.",
    quickSummary: `${proteinName}의 예측 구조입니다. 전체 접힘과 도메인 배치를 먼저 이해하는 데 유용합니다.`,
    description:
      `${proteinName}의 예측 구조입니다. 전체 접힘의 윤곽과 도메인 배치를 살펴보는 데 유용합니다.${organism ? ` ${organism}에서 보고된 단백질입니다.` : ""}`,
    features: [
      ["blue", "구조", "단일 사슬의 접힘과 도메인 배치를 이해하는 데 적합합니다."],
      ["purple", "신뢰도", "pLDDT가 높을수록 해당 잔기 주변의 국소 구조를 더 신뢰할 수 있습니다."],
      ["green", "생물종", organism || "UniProt 기록 기반"],
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
    stateKey: state?.stateKey || protein.stateKey,
    stateLabel: state?.stateLabel || protein.stateLabel,
    stateLabelEn: state?.stateLabelEn || protein.stateLabelEn,
    stateReason: state?.stateReason || protein.stateReason,
    stateReasonEn: state?.stateReasonEn || protein.stateReasonEn
  });
}

function addGenericMetadata(protein) {
  const family = protein.family || inferProteinFamily(protein);
  const state = inferGenericState(protein);
  return {
    ...protein,
    family,
    stateKey: protein.stateKey || state.stateKey,
    stateLabel: protein.stateLabel || state.stateLabel,
    stateLabelEn: protein.stateLabelEn || state.stateLabelEn,
    stateReason: protein.stateReason || state.stateReason,
    stateReasonEn: protein.stateReasonEn || state.stateReasonEn
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
      stateKey: state.stateKey,
      stateLabel: state.stateLabel,
      stateLabelEn: state.stateLabelEn,
      stateReason: state.stateReason,
      stateReasonEn: state.stateReasonEn
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
  const facts = [protein.method || "실험", protein.resolution].filter(Boolean).join(" · ");

  if (id === "4HHB") {
    return {
      koreanName: "헤모글로빈 A",
      stateKey: "adult",
      stateLabel: "성인형",
      stateLabelEn: "Adult form",
      stateReason: `성인에게 가장 흔한 표준 헤모글로빈입니다. 비결합형, 산소 결합형, 변이형과 비교할 때 기준점으로 쓰기 좋습니다. (${id})`,
      stateReasonEn: `The common adult hemoglobin form. Use it as the baseline for comparing unbound, oxygen-bound, and variant forms. (${id})`
    };
  }

  if (id === "1HHO") {
    return {
      koreanName: "산소 결합 헤모글로빈",
      stateKey: "oxygen_bound",
      stateLabel: "산소 결합형",
      stateLabelEn: "Oxygen-bound",
      stateReason: `산소가 헴에 붙은 R 상태에 가까운 구조입니다. 산소가 붙으며 친화도가 높아지는 협동성 설명에 좋습니다. (${id})`,
      stateReasonEn: `Oxygen is bound to the heme groups, close to the relaxed R state. Compare it with the unbound form to see cooperative oxygen binding. (${id})`
    };
  }

  if (id === "2HHB") {
    return {
      koreanName: "데옥시헤모글로빈",
      stateKey: "unbound",
      stateLabel: "비결합형",
      stateLabelEn: "Unbound",
      stateReason: `산소가 붙지 않은 T 상태 구조입니다. 산소 결합형과 비교하면 사슬 사이 배치와 헴 주변 위치가 달라집니다. (${id})`,
      stateReasonEn: `Oxygen is not bound, so this is close to the tense T state. Compare it with the oxygen-bound form to see chain and heme rearrangements. (${id})`
    };
  }

  if (/2hhb|deoxy|unliganded|t-state|tense/.test(value)) {
    return {
      koreanName: "데옥시헤모글로빈",
      stateKey: "unbound",
      stateLabel: "비결합형",
      stateLabelEn: "Unbound",
      stateReason: `산소가 붙지 않은 T 상태 구조입니다. 산소 결합형과 비교하면 사슬 사이 배치와 헴 주변 위치가 달라집니다. (${id || facts})`,
      stateReasonEn: `Oxygen is not bound, so this is close to the tense T state. Compare it with oxygen-bound hemoglobin to see chain and heme rearrangements. (${id || facts})`
    };
  }

  if (/1hho|oxy|oxygenated|o2|liganded|r-state|relaxed/.test(value)) {
    return {
      koreanName: "산소 결합 헤모글로빈",
      stateKey: "oxygen_bound",
      stateLabel: "산소 결합형",
      stateLabelEn: "Oxygen-bound",
      stateReason: `산소가 헴에 붙은 R 상태에 가까운 구조입니다. 산소가 붙으며 친화도가 높아지는 협동성 설명에 좋습니다. (${id || facts})`,
      stateReasonEn: `Oxygen is bound to heme, close to the relaxed R state. It helps explain why later oxygen molecules bind more easily. (${id || facts})`
    };
  }

  if (/carbonmonoxy|carboxy|carbon monoxide|\bco\b|co-/.test(value)) {
    return {
      koreanName: "일산화탄소 결합 헤모글로빈",
      stateKey: "co_bound",
      stateLabel: "CO 결합형",
      stateLabelEn: "CO-bound",
      stateReason: `일산화탄소가 헴에 붙은 구조입니다. 산소보다 강하게 결합하는 이유와 중독 위험을 설명할 때 씁니다. (${id || facts})`,
      stateReasonEn: `Carbon monoxide is bound to heme. Compare it with oxygen-bound hemoglobin to explain stronger binding and poisoning risk. (${id || facts})`
    };
  }

  if (/methemoglobin|met|ferric|aquomet|cyanomet/.test(value)) {
    return {
      koreanName: "메트헤모글로빈",
      stateKey: "oxidized",
      stateLabel: "산화형",
      stateLabelEn: "Oxidized",
      stateReason: `철이 산화되었거나 물/시안화물이 결합한 상태입니다. 산소 운반이 어려운 변형 상태를 비교할 때 좋습니다. (${id || facts})`,
      stateReasonEn: `The heme iron is oxidized or bound to water/cyanide. Use it to compare a form that cannot carry oxygen normally. (${id || facts})`
    };
  }

  if (/4hhb|adult|hemoglobin a|haemoglobin a/.test(value)) {
    return {
      koreanName: "헤모글로빈 A",
      stateKey: "adult",
      stateLabel: "성인형",
      stateLabelEn: "Adult form",
      stateReason: `성인에게 가장 흔한 표준 헤모글로빈입니다. 비결합형, 산소 결합형, 변이형과 비교할 때 기준점으로 쓰기 좋습니다. (${id || facts})`,
      stateReasonEn: `The common adult hemoglobin form. Use it as the baseline for comparing unbound, oxygen-bound, and variant forms. (${id || facts})`
    };
  }

  if (/fetal|hemoglobin f|haemoglobin f/.test(value)) {
    return {
      koreanName: "태아 헤모글로빈",
      stateKey: "fetal",
      stateLabel: "태아형",
      stateLabelEn: "Fetal form",
      stateReason: `태아에서 산소를 더 잘 붙잡도록 사슬 조성이 다른 형태입니다. 성인형과 산소 친화도 차이를 비교합니다. (${id || facts})`,
      stateReasonEn: `This fetal form has a different chain composition that helps bind oxygen more tightly than adult hemoglobin. (${id || facts})`
    };
  }

  if (/sickle|mutant|variant|mutation|hb s|hbs/.test(value)) {
    return {
      koreanName: "변이 헤모글로빈",
      stateKey: "variant",
      stateLabel: "변이형",
      stateLabelEn: "Variant",
      stateReason: `아미노산 변이 또는 질환 관련 구조입니다. 정상 성인형과 비교해 표면 전하와 사슬 접촉 차이를 봅니다. (${id || facts})`,
      stateReasonEn: `This disease- or mutation-related structure is useful for comparing surface charge and chain contacts against normal adult hemoglobin. (${id || facts})`
    };
  }

  return {
    koreanName: "헤모글로빈",
    stateKey: "condition",
    stateLabel: "실험 조건형",
    stateLabelEn: "Experimental condition",
    stateReason: `같은 헤모글로빈이지만 등록된 실험 조건, 결합 분자, 해상도가 다른 구조입니다. 먼저 성인형과 비교해 무엇이 붙었는지 확인합니다. (${id || facts})`,
    stateReasonEn: `This is still hemoglobin, but its experimental condition, bound molecule, or resolution differs. Compare it against adult hemoglobin first. (${id || facts})`
  };
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
  const text = `${protein.name || ""} ${protein.englishName || ""} ${protein.pdbId || ""} ${protein.method || ""} ${protein.resolution || ""}`.toLowerCase();
  const id = protein.pdbId || protein.accession || protein.alphaFoldId || "ID 없음";
  const resolution = Number.parseFloat(protein.resolution);
  const resolutionText = Number.isFinite(resolution) ? `${resolution} A` : protein.resolution || "";
  const detailId = resolutionText ? `${id}, ${resolutionText}` : id;

  if (/transition state|tetrahedral/.test(text)) {
    return {
      stateKey: "transition",
      stateLabel: "전이상태 복합체",
      stateLabelEn: "Transition-state complex",
      stateReason: `반응 중간 상태를 흉내 낸 구조입니다. 활성 부위가 기질을 처리하는 순간의 원자 배치를 보여줍니다. (${id})`,
      stateReasonEn: `This structure mimics a reaction intermediate and shows how atoms are arranged in the active site during catalysis. (${id})`
    };
  }
  if (/inhibitor|tosyl|ligand|bound|complex|substrate|product|drug|analog|analogue|calcium|zinc|metal/.test(text)) {
    return {
      stateKey: "bound",
      stateLabel: "결합형",
      stateLabelEn: "Bound form",
      stateReason: `억제제, 기질, 금속 이온 같은 분자가 결합한 구조입니다. 결합 부위와 기능 조절 위치가 함께 드러납니다. (${id})`,
      stateReasonEn: `A ligand, substrate, inhibitor, or metal ion is bound, revealing the binding site and regulatory region. (${id})`
    };
  }
  if (/dimer|trimer|tetramer|oligomer|assembly|multimer|hexamer/.test(text)) {
    return {
      stateKey: "oligomer",
      stateLabel: "올리고머형",
      stateLabelEn: "Oligomeric form",
      stateReason: `여러 사슬이 함께 있는 구조입니다. 사슬 사이 접촉면과 조립 상태를 볼 수 있습니다. (${id})`,
      stateReasonEn: `Multiple chains are assembled together, making chain interfaces and assembly state visible. (${id})`
    };
  }
  if (/mutant|variant|mutation/.test(text)) {
    return {
      stateKey: "variant",
      stateLabel: "변이형",
      stateLabelEn: "Variant",
      stateReason: `아미노산이 바뀐 구조입니다. 변이가 접힘, 표면 전하, 결합 부위에 영향을 줄 수 있는 위치를 보여줍니다. (${id})`,
      stateReasonEn: `This structure contains a sequence change and shows where folding, surface charge, or binding may be affected. (${id})`
    };
  }
  if (/apo|unbound|free|unliganded/.test(text)) {
    return {
      stateKey: "unbound",
      stateLabel: "비결합형",
      stateLabelEn: "Unbound form",
      stateReason: `리간드나 기질이 없는 구조입니다. 단백질 자체의 기본 접힘과 빈 결합 홈을 보여줍니다. (${id})`,
      stateReasonEn: `No ligand or substrate is bound, so the fold and empty binding pocket are visible. (${id})`
    };
  }
  if (/discontinuity|interruption|break in the repeating|sequence gap/.test(text)) {
    return {
      stateKey: "repeat_disruption",
      stateLabel: "반복 끊김 변형",
      stateLabelEn: "Repeat-disrupted fragment",
      stateReason: `반복 서열이 끊기거나 변형된 단편 구조입니다. 반복성이 깨진 부분에서 삼중나선 안정성이 어떻게 달라지는지 보여줍니다. (${detailId})`,
      stateReasonEn: `This fragment contains a break or disruption in the repeat, showing how triple-helix stability changes locally. (${detailId})`
    };
  }
  if (/average|consensus/.test(text)) {
    return {
      stateKey: "average_model",
      stateLabel: "평균 모델",
      stateLabelEn: "Averaged model",
      stateReason: `여러 반복 단위의 평균적인 배열을 보여주는 구조입니다. 콜라겐 반복부의 기준적인 패킹과 간격을 읽기 좋습니다. (${detailId})`,
      stateReasonEn: `This structure shows an averaged arrangement of repeat units, making the repeat packing and spacing easy to read. (${detailId})`
    };
  }
  if (/pro-hyp-gly|hydroxyproline|hyp/.test(text)) {
    return {
      stateKey: "hydroxyproline_repeat",
      stateLabel: "Hyp 반복 단편",
      stateLabelEn: "Hyp-repeat fragment",
      stateReason: `하이드록시프롤린(Hyp)이 들어간 반복 펩타이드 구조입니다. Hyp가 콜라겐 삼중나선을 안정화하는 위치를 보여줍니다. (${detailId})`,
      stateReasonEn: `This repeat peptide contains hydroxyproline (Hyp), showing where Hyp helps stabilize the collagen triple helix. (${detailId})`
    };
  }
  if (/pro-pro-gly/.test(text)) {
    return {
      stateKey: "proline_repeat",
      stateLabel: "Pro-Pro-Gly 반복",
      stateLabelEn: "Pro-Pro-Gly repeat",
      stateReason: `Pro-Pro-Gly 반복 서열만 떼어 본 콜라겐 모델입니다. 반복 길이와 삼중나선 패킹을 단순한 형태로 보여줍니다. (${detailId})`,
      stateReasonEn: `This collagen model isolates a Pro-Pro-Gly repeat and shows repeat length and triple-helix packing in a simplified form. (${detailId})`
    };
  }
  if (/triple helix|triple-helical/.test(text)) {
    return {
      stateKey: "triple_helix",
      stateLabel: "삼중나선 모델",
      stateLabelEn: "Triple-helix model",
      stateReason: `콜라겐의 핵심 삼중나선 배열을 보여주는 구조입니다. 세 사슬의 감김과 수소결합 배열을 볼 수 있습니다. (${detailId})`,
      stateReasonEn: `This model emphasizes the collagen triple helix, including chain wrapping and hydrogen-bond geometry. (${detailId})`
    };
  }
  if (/model|fiber|fibre|peptide|fragment|collagen-like/.test(text)) {
    return {
      stateKey: "model_fragment",
      stateLabel: "모델/단편 구조",
      stateLabelEn: "Model or fragment",
      stateReason: `전체 단백질보다 반복 서열, 단편, 섬유 모델을 자세히 본 구조입니다. 특정 반복부나 섬유 배열이 안정화되는 방식을 보여줍니다. (${detailId})`,
      stateReasonEn: `This focuses on a repeat, fragment, or fiber model rather than the whole protein, showing local or fiber packing. (${detailId})`
    };
  }
  if (/refined|high resolution|crystal structure|crystalline/.test(text) || Number.isFinite(resolution)) {
    return {
      stateKey: Number.isFinite(resolution) && resolution <= 1.5 ? "high_resolution" : "refined",
      stateLabel: Number.isFinite(resolution) && resolution <= 1.5 ? "고해상도 결정 구조" : "정제 결정 구조",
      stateLabelEn: Number.isFinite(resolution) && resolution <= 1.5 ? "High-resolution crystal" : "Refined crystal structure",
      stateReason: `${resolutionText} 해상도로 원자 위치를 다듬은 구조입니다. 전체 접힘과 결합 부위의 기본 배치를 읽기 좋습니다. (${id})`,
      stateReasonEn: `A ${resolutionText} structure with refined atomic positions, useful for reading the fold and binding-site layout. (${id})`
    };
  }

  return {
    stateKey: "condition",
    stateLabel: "실험 조건형",
    stateLabelEn: "Experimental condition",
    stateReason: `같은 단백질이지만 실험 조건, 해상도, 결합 분자, 사슬 조립 상태가 다를 수 있는 구조입니다. (${id})`,
    stateReasonEn: `This is the same protein family, but the experimental condition, resolution, bound molecule, or chain assembly may differ. (${id})`
  };
}

function describeDifferenceFromRepresentative(candidate, representative) {
  const inferred = inferGenericState(candidate);
  const base = candidate.stateReason || inferred.stateReason;
  const baseEn = candidate.stateReasonEn || inferred.stateReasonEn;
  return {
    ko: base,
    en: baseEn
  };
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

function interpretStructureText(name, title, organism, method, resolution, pdbId) {
  const sourceText = `${name || ""} ${title || ""}`;
  const lower = sourceText.toLowerCase();
  const methodText = method ? `${method} 실험으로 얻은` : "실험으로 얻은";
  const resolutionText = resolution ? `${resolution} A 해상도의` : "";
  const context = organism ? `${organism}에서 보고된 구조입니다.` : "생물종 정보가 제한된 PDB 구조입니다.";
  const prefix = resolutionText ? `${resolutionText} ${methodText} 구조입니다.` : `${methodText} 구조입니다.`;

  const cases = [
    {
      pattern: /bombyxin|insulin-related|insulin related|insulin|relaxin/,
      summary: "인슐린과 비슷한 방식으로 접히는 작은 신호성 펩타이드 구조입니다.",
      description:
        "이 구조는 누에나방의 뇌에서 분비되는 봄빅신-II처럼 인슐린 계열과 닮은 작은 신호성 펩타이드의 입체 형태를 보여줍니다. 핵심은 작은 사슬들이 어떤 모양으로 접히고, 인슐린·릴랙신 같은 호르몬과 어느 부분이 비슷한지 확인하는 것입니다.",
      structurePoint: "작은 펩타이드 사슬이 호르몬처럼 접히는 방식을 보여줍니다.",
      inspectPoint: "사슬 사이 이황화 결합, 짧은 나선, 인슐린 계열과 닮은 접힘을 먼저 보세요."
    },
    {
      pattern: /hemoglobin|haemoglobin/,
      summary: "산소 운반 단백질의 헴 주변 결합 상태와 사슬 배치를 보여주는 구조입니다.",
      description:
        "헤모글로빈 구조는 산소를 싣고 내려놓는 단백질이 네 개의 사슬과 헴 그룹을 어떻게 배치하는지 보여줍니다. 헴 주변, 사슬 사이 접촉면, 결합 상태를 보면 산소 친화도가 왜 달라지는지 이해하기 쉽습니다.",
      structurePoint: "여러 사슬이 모인 혈액 단백질의 접힘과 헴 배치를 보여줍니다.",
      inspectPoint: "헴 주변 원자, 사슬 사이 접촉면, 산소 또는 다른 작은 분자 결합 위치를 보세요."
    },
    {
      pattern: /collagen|triple helix|pro-hyp-gly|pro-pro-gly/,
      summary: "콜라겐 삼중나선이나 반복 펩타이드가 어떻게 안정화되는지 보여주는 구조입니다.",
      description:
        "콜라겐 관련 구조는 긴 섬유 단백질의 반복 서열이 세 가닥으로 감기며 강한 삼중나선을 만드는 방식을 보여줍니다. Pro, Gly, Hyp 같은 반복 잔기가 나선의 촘촘한 패킹과 안정성에 어떻게 기여하는지 보는 데 적합합니다.",
      structurePoint: "세 가닥이 감긴 삼중나선 또는 그 반복 단편을 보여줍니다.",
      inspectPoint: "반복 서열의 간격, 세 사슬의 감김, Hyp가 들어간 부분의 안정화를 보세요."
    },
    {
      pattern: /chymotrypsin|trypsin|protease|peptidase/,
      summary: "단백질을 자르는 효소의 활성 부위와 결합 상태를 보여주는 구조입니다.",
      description:
        "이 효소 구조는 단백질 사슬을 자르는 활성 부위가 어떤 홈과 잔기 배치로 만들어지는지 보여줍니다. 억제제나 전이상태 유사체가 있으면 효소가 기질을 붙잡고 반응시키는 위치를 더 직접적으로 볼 수 있습니다.",
      structurePoint: "효소의 접힘과 활성 부위 홈을 보여줍니다.",
      inspectPoint: "활성 부위 주변 잔기, 결합한 억제제나 기질 유사체, 표면 홈을 확인하세요."
    },
    {
      pattern: /antibody|immunoglobulin/,
      summary: "항원 인식에 쓰이는 항체 도메인의 접힘과 결합면을 보여주는 구조입니다.",
      description:
        "항체 구조는 면역 단백질이 표적을 인식하기 위해 어떤 도메인과 결합면을 만드는지 보여줍니다. 끝부분의 가변 영역과 표면 홈을 보면 항원 선택성이 생기는 위치를 이해하기 좋습니다.",
      structurePoint: "항체 도메인의 접힘과 표적 인식 면을 보여줍니다.",
      inspectPoint: "가변 영역, 항원 결합면, 사슬 사이 접촉을 보세요."
    }
  ];

  const match = cases.find((item) => item.pattern.test(lower));
  if (match) {
    return {
      summary: match.summary,
      description: `${match.description} ${prefix} ${context}`,
      structurePoint: match.structurePoint,
      context,
      inspectPoint: match.inspectPoint
    };
  }

  const plainName = cleanStructureTitle(name || title || `PDB ${pdbId}`);
  return {
    summary: `${plainName}의 접힘과 사슬 배치를 보여주는 구조입니다.`,
    description: `${plainName} 구조는 단백질 사슬이 어떤 입체 형태로 접히는지 보여줍니다. 리본에서는 전체 접힘 흐름을, 원자 보기에서는 결합 부위와 작은 분자 주변 배치를 확인할 수 있습니다. ${prefix} ${context}`,
    structurePoint: "단백질 사슬의 전체 접힘과 영역 배치를 보여줍니다.",
    context,
    inspectPoint: "사슬의 접힘 방향, 표면 홈, 결합한 작은 분자나 금속 이온을 확인하세요."
  };
}

function cleanStructureTitle(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\bat\s+[0-9.]+\s*(angstroms?|a)\s*resolution\b/gi, "")
    .replace(/\s*[:;,]\s*$/g, "")
    .trim();
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
  const context = organism ? `${organism}에서 보고된 ` : "";
  const methodText = method ? `${method} 구조` : "단백질 구조";
  return `${context}${methodText}입니다. 단백질의 접힘, 결합 부위, 상호작용 위치를 빠르게 파악할 수 있습니다.`;
}
