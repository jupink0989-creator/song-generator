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
각 버전은 완전히 같은 문장 구조가 아니라, 표현과 감정선이 다르게 느껴져야 해.

입력 정보:
제목: ${title}
주제: ${topic}
키워드: ${keywordText}
무드: ${mood}
언어: ${language}

규칙:
- 결과는 정확히 ${variants}개
- 각 버전은 "===VERSION===" 로 구분
- 각 버전은 제목 없이 가사 본문만 출력
- 반드시 섹션 표기를 괄호로 넣을 것
- 예시 형식:
  (Verse 1)
  ...
  (Pre-Chorus)
  ...
  (Chorus)
  ...
  (Verse 2)
  ...
  (Bridge)
  ...
  (Chorus)
  ...

- 각 버전은 최소한 아래 구조를 포함:
  (Verse 1)
  (Chorus)

- 섹션 표기는 언어와 상관없이 반드시 아래 중 하나 사용:
  (Verse 1), (Verse 2), (Pre-Chorus), (Chorus), (Bridge), (Outro)

- 섹션 표기 없는 본문은 출력하지 말 것
- 너무 뻔한 표현 반복 금지
- 상투적인 문장 남발 금지
- 감정선이 자연스럽게 흐르도록 작성
- 노래 가사처럼 줄바꿈을 살려서 작성
- 각 버전은 서로 결이 달라야 함
- ${language}로만 작성
- 섹션 이름만 영어 표기 괄호로 두고, 가사 본문은 ${language}로 작성
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

    const text = data.output_text || "";

    const lyrics = text
      .split("===VERSION===")
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, Number(variants) || 4);

    return res.status(200).json({ lyrics, rawText: text });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "서버 오류가 발생했어."
    });
  }
}
