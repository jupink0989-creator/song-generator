export default async function handler(req, res) {
  const { topic, keywords, mood } = req.body;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-5",
      input: `주제: ${topic}, 키워드: ${keywords}, 무드: ${mood}.
      노래 제목 10개 만들어줘.`
    })
  });

  const data = await response.json();

  res.json({
    titles: data.output[0].content[0].text.split("\n")
  });
}