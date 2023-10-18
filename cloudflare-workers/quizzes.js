const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function uuidv4() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

export default {
  async fetch(request, env) {
    // if method is not POST, return 405
    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    // if the request length is > 10kb, return 413
    if (request.headers.get("content-length") > 10000) {
      return new Response("Request too large", {
        status: 413,
        headers: corsHeaders,
      });
    }

    const githubAuthorization = env.GITHUB_AUTHORIZATION;

    const data = await request.json();
    const quiz = data.quiz;

    // Validate the quiz object, it should follow the schema
    /*
            {
              topic: string
              baseLanguage: string
              language: string
              difficulty?: string
              questions: Array<{
                question: string
                options: Array<string>
                correctAnswer: string
                explanation?: string
              }>
          },
        */
    let check = true;
    try {
      check = check && typeof quiz.topic === "string";
      check =
        check &&
        typeof quiz.baseLanguage === "string" &&
        quiz.baseLanguage.length === 2;
      check =
        check &&
        typeof quiz.language === "string" &&
        quiz.language.length === 2;
      check = check && Array.isArray(quiz.questions);
      check =
        check &&
        quiz.questions.every((question) => {
          let questionCheck = true;
          questionCheck =
            questionCheck && typeof question.question === "string";
          questionCheck = questionCheck && Array.isArray(question.options);
          questionCheck =
            questionCheck &&
            question.options.every((option) => typeof option === "string");
          questionCheck =
            questionCheck && typeof question.correctAnswer === "string";
          return questionCheck;
        });
    } catch {
      check = false;
    }
    if (!check) {
      return new Response("Invalid quiz object", {
        status: 400,
        headers: corsHeaders,
      });
    }

    const repo = "app";
    const owner = "gptlingo";
    const folder = "quizzes";
    // the filename should be a generated guid.json
    const quizId = uuidv4();
    const filename = `${quizId}.json`;

    // content should be base64 encoded
    const content = btoa(
      JSON.stringify({
        id: quizId,
        baseLanguage: quiz.baseLanguage,
        language: quiz.language,
        topic: quiz.topic,
        difficulty: quiz.difficulty,
        questions: quiz.questions,
      })
    );
    const message = "Add quiz";

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${folder}/${quiz.baseLanguage}/${quiz.language}/${filename}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${githubAuthorization}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "gptlingo",
        },
        method: "PUT",
        body: JSON.stringify({
          message,
          content,
        }),
      }
    );

    return new Response(response.body, {
      headers: corsHeaders,
    });
  },
};
