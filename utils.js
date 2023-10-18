async function fetchQuiz(quizName, baseLanguage, language) {
  const quizFetch = await fetch(
    `https://gptlingo.github.io/app/quizzes/${baseLanguage}/${language}/${quizName}`
  );
  // the response is in ISO-8859-1, we need to convert it to UTF-8
  const quizBuffer = await quizFetch.arrayBuffer();
  const decoder = new TextDecoder("iso-8859-1");
  const quizDataString = decoder.decode(quizBuffer);
  // now we can parse the JSON
  const quizData = JSON.parse(quizDataString);
  window[`quiz-${quizData.id}`] = quizData;
  return quizData;
}

function getQuizGenerationPrompt({
  language,
  topic,
  instructions,
  difficulty,
  baseLanguage,
}) {
  const readableLanguage = languageMap[language];
  const readableBaseLanguage = languageMap[baseLanguage];

  const prompt = `Generate a ${readableLanguage} language learning quiz with the following format:
  {
    topic: string,
    questions: Array<{
      question: string,
      options: Array<string>,
      correctAnswer: string,
      explanation?: string,
    }>
  }
  The topic is "${topic}". The student base language is "${readableBaseLanguage}".
  ${instructions ? `Use the following instructions: "${instructions}".` : ""}
  ${difficulty ? `The difficulty (CEFR) is "${difficulty}". ` : ""}
  The explanation field is optional, use it if the answer is not obvious.
  There should be at least 8 questions. The result must be pure JSON.
  `;
  return prompt;
}

async function getGPTQuestions(quizGenerationData) {
  const url = "https://api.openai.com/v1/chat/completions";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${quizGenerationData.apiKey}`,
  };
  const data = {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: getQuizGenerationPrompt(quizGenerationData),
      },
    ],
    stream: true,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data),
    });

    return response;
  } catch (error) {
    // Handle the error
  }
}
