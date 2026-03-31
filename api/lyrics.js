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
      title = "",
      variants = 4
    } = req.body || {};

    const keywordText = Array.isArray(keywords)
      ? keywords.join(", ")
      : String(keywords || "");

    const prompt = `
너는 감성적인 노래 작사가야.

아래 정보를 바탕으로 서로 다른 방향의 가사 ${variants}개를 작성해.

입력 정보:
제목: ${title}
주제: ${topic}
키워드: ${keywordText}
무드: ${mood}
언어: ${language}

규칙:
- 반드시 JSON 배열만 출력
- 설명 절대 금지
- 배열 원소는 각각 가사 한 버전
- 각 가사는 반드시 아래 섹션 표기를 포함
  (Verse 1)
  (Pre-Chorus)
  (Chorus)
  (Verse 2)
  (Bridge)
  (Chorus)
- 섹션 이름은 꼭 괄호로 표기
- 가사 본문은 ${language}로 작성
- 상투적인 표현 반복 금지
- 각 버전은 서로 다르게
- 총 ${variants}개

예시 형식:
[
  "(Verse 1)\\n...\\n\\n(Chorus)\\n...",
  "(Verse 1)\\n...\\n\\n(Chorus)\\n..."
]
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
        error: data?.error?.message || "OpenAI 가사 생성 실패",
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

    let lyrics = [];

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        lyrics = parsed.map(v => String(v).trim()).filter(Boolean);
      }
    } catch (e) {
      lyrics = text
        .split("===VERSION===")
        .map(v => v.trim())
        .filter(Boolean);
    }

    return res.status(200).json({
      lyrics: lyrics.slice(0, Number(variants) || 4),
      rawText: text
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "서버 오류가 발생했어."
    });
  }
}
