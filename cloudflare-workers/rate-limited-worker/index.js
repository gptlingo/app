import { Redis } from "@upstash/redis/cloudflare";
import { Ratelimit } from "@upstash/ratelimit";

const cache = new Map();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function getQuizGenerationPrompt({
  readableLanguage,
  topic,
  instructions,
  difficulty,
  readableBaseLanguage,
}) {
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

export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname == "/favicon.ico") {
      return new Response(null, { status: 400 });
    }

    // if method is not POST, return 405
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const data = await request.json();

    if (
      data.topic?.length > 40 ||
      data.baseLanguage?.length !== 2 ||
      data.language?.length !== 2 ||
      data.instructions?.length > 150 ||
      (data.difficulty &&
        !["A1", "A2", "B1", "B2", "C1", "C2"].includes(data.difficulty))
    ) {
      return new Response("Invalid data", {
        status: 400,
        headers: corsHeaders,
      });
    }

    const redis = Redis.fromEnv(env);

    // Create a new ratelimiter, that allows 10 requests per hour = 3600 seconds
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "3600s"),
      analytics: true,
      ephemeralCache: cache,
    });

    // Use a constant string to limit all requests with a single ratelimit
    // Or use a userID, apiKey or ip address for individual limits.
    const identifier = "api";
    const { success } = await ratelimit.limit(identifier);

    if (!success) {
      return new Response("Too Many Requests", {
        status: 429,
        headers: corsHeaders,
      });
    }

    const apiKey = env.OPENAI_API_KEY;

    const url = "https://api.openai.com/v1/chat/completions";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    const gptData = {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: getQuizGenerationPrompt(data),
        },
      ],
      stream: true,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(gptData),
    });

    return response;
  },
};
