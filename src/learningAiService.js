export async function generateLearningExpansion(topic) {
  const config = getAiConfig();
  const prompt = buildPrompt(topic);

  if (config?.endpoint) {
    try {
      return await requestConfiguredAi(config, prompt);
    } catch {
      return buildLocalExpansion(topic);
    }
  }

  return buildLocalExpansion(topic);
}

function getAiConfig() {
  const globalConfig = window.FOLDNOTE_AI || {};
  const endpoint = globalConfig.endpoint || window.localStorage.getItem("foldnote.aiEndpoint");
  const token = globalConfig.token || window.localStorage.getItem("foldnote.aiToken");
  const model = globalConfig.model || window.localStorage.getItem("foldnote.aiModel") || "";
  if (!endpoint) return null;
  return { endpoint, token, model };
}

async function requestConfiguredAi(config, prompt) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (config.token) headers.Authorization = `Bearer ${config.token}`;

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model || undefined,
      messages: [
        {
          role: "system",
          content:
            "You are a careful Korean biochemistry tutor. Explain concepts for education only and avoid clinical diagnosis."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.4
    })
  });

  if (!response.ok) throw new Error(`AI request failed: ${response.status}`);
  const data = await response.json();
  const text =
    data?.choices?.[0]?.message?.content ||
    data?.generated_text ||
    data?.response ||
    "";
  if (!text.trim()) throw new Error("AI response was empty");
  return text.trim();
}

function buildPrompt(topic) {
  const cards = (topic.cards || [])
    .map((card) => `${card.title}: ${stripHtml(card.description || "")}`)
    .join("\n");

  return [
    `주제: ${topic.title}`,
    `핵심 설명: ${stripHtml(topic.intro || "")}`,
    "카드:",
    cards,
    "",
    "이 주제를 더 넓게 공부할 수 있도록 다음 형식으로 한국어 학습 내용을 작성해 주세요.",
    "1. 한 줄 핵심",
    "2. 더 배울 개념 3개",
    "3. 구조 뷰어에서 관찰할 것 3개",
    "4. 퀴즈 2개와 짧은 답"
  ].join("\n");
}

function buildLocalExpansion(topic) {
  const firstCards = (topic.cards || []).slice(0, 3);
  const concepts = firstCards.map((card) => card.title).filter(Boolean);
  const observations = firstCards
    .flatMap((card) => card.examples || [])
    .slice(0, 3);

  return [
    `한 줄 핵심: ${stripHtml(topic.intro || "").replace(/\s+/g, " ").slice(0, 110)}...`,
    "",
    "더 배울 개념",
    ...concepts.map((concept, index) => `${index + 1}. ${concept}가 단백질 구조와 기능을 어떻게 연결하는지 정리해 보세요.`),
    "",
    "구조 뷰어에서 관찰할 것",
    ...(observations.length
      ? observations.map((item, index) => `${index + 1}. ${item}`)
      : ["1. 리본에서 도메인 배치", "2. 표면 보기에서 결합 포켓", "3. 스틱 보기에서 주변 잔기"]),
    "",
    "퀴즈",
    `1. ${concepts[0] || "이 주제"}가 단백질 기능에 영향을 주는 이유는?`,
    "답: 구조의 안정성, 결합 위치, 상호작용 방식을 바꾸기 때문입니다.",
    `2. 구조 뷰어에서 가장 먼저 확인할 정보는?`,
    "답: 전체 접힘, 결합 부위, 품질 지표를 함께 확인합니다."
  ].join("\n");
}

function stripHtml(value) {
  return String(value || "").replace(/<[^>]*>/g, "");
}
