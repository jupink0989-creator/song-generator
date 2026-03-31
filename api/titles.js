export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 가능해." });
  }

  try {
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
      : String(keywords);

    const previousText = Array.isArray(previousTitles) && previousTitles.length
      ? `\n이전에 만든 제목들:\n- ${previousTitles.join("\n- ")}\n이 제목들과 너무 비슷하지 않게 새롭게 만들어줘.`
      : "";

    const prompt = `
너는 감성 플레이리스트 채널용 제목을 잘 만드는 카피라이터야.

목표:
- 유튜브 플레이리스트/음악 채널에서 클릭하고 싶게 느껴지는 제목 만들기
- 너무 광고 같거나 과장되지 않기
- 감정선, 장면감, 듣고 싶은 분위기를 잘 살리기
- 짧고 자연스럽고 예쁘게
- 낚시성, 자극적인 과장, 어색한 문장 금지
- 같은 패턴 반복 금지
- 제목마다 결이 조금씩 다르게

입력 정보:
주제: ${topic}
키워드: ${keywordText}
무드: ${mood}
언어: ${language}
개수: ${count}${previousText}

제목 작성 기준:
- 제목만 출력
- 번호 붙이지 말기
- 따옴표 붙이지 말기
- 한 줄에 제목 하나씩
- 총 ${count}개
- 유튜브 썸네일/플레이리스트 제목으로 바로 써도 될 만큼 자연스럽게
- 감성형, 상황형, 몰입형 제목을 적절히 섞기
- 너무 긴 문장 금지
- ${regenerate ? "이전 제목들과 표현이 겹치지 않도록 더 새롭게" : "첫 시도답게 다양하게"} 작성
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: prompt
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI 제목 생성 실패"
      });
    }

    const text =
      data?.output_text ||
      data?.output?.map(item =>
        (item.content || [])
          .map(content => content.text || "")
          .join("")
      ).join("\n") ||
      "";

    const titles = text
      .split("\n")
      .map(v => v.trim())
      .map(v => v.replace(/^[-•\d.\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, Number(count) || 10);

    return res.status(200).json({ titles });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "서버 오류가 발생했어."
    });
  }
}
