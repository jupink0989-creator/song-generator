export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 가능해." });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY가 설정되지 않았어." });
    }

    const {
      topic = "",
      keywords = "",
      mood = "",
      language = "한국어",
      count = 10,
      regenerate = false,
      previousTitles = []
    } = req.body || {};

    const keywordText = Array.isArray(keywords)
      ? keywords.join(", ")
      : String(keywords || "");

    const previousText =
      Array.isArray(previousTitles) && previousTitles.length
        ? `\n이전에 만든 제목들:\n- ${previousTitles.join("\n- ")}\n이 제목들과 너무 비슷하지 않게 새롭게 만들어줘.`
        : "";

    const prompt = `
너는 감성적인 노래 제목을 잘 짓는 작명가야.

목표:
- 플레이리스트 제목이 아니라 개별 곡 제목 만들기
- 실제 노래 제목처럼 자연스럽고 세련되게
- 감정선, 장면감, 여운이 느껴지게
- 상투적이거나 유치한 제목 금지
- 같은 패턴 반복 금지

입력 정보:
주제: ${topic}
키워드: ${keywordText}
무드: ${mood}
언어: ${language}
개수: ${count}${previousText}

출력 규칙:
- 반드시 JSON 배열만 출력
- 설명 절대 금지
- 예시 형식:
["푸른 귀가","창가의 온도","저녁의 잔상"]
- 총 ${count}개
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: prompt,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI 제목 생성 실패",
        raw: data
      });
    }

    const text =
      data.output_text ||
      data.output?.map(item =>
        (item.content || [])
          .map(c => c.text || "")
          .join("")
      ).join("\n") ||
      "";

    let titles = [];

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        titles = parsed.map(v => String(v).trim()).filter(Boolean);
      }
    } catch (e) {
      titles = text
        .split("\n")
        .map(v => v.trim())
        .map(v => v.replace(/^[-•\d.\s]+/, "").trim())
        .filter(Boolean);
    }

    return res.status(200).json({
      titles: titles.slice(0, Number(count) || 10),
      rawText: text
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "서버 오류가 발생했어."
    });
  }
}
