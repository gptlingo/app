const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export default {
  async fetch(request, env) {
    // if method is not POST, return 405
    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    // if the request length is > 100kb, return 413
    if (request.headers.get("content-length") > 100000) {
      return new Response("Request too large", {
        status: 413,
        headers: corsHeaders,
      });
    }

    const githubAuthorization = env.GITHUB_AUTHORIZATION;

    const data = await request.json();
    const user = data.user;

    // Validate the user object, it should follow the schema
    /*
        {
            id: string
            password: string
            quizzes?: {
                [key: string]: { // base language code, should have length 2
                    [key: string]: { // language code, should have length 2
                        [key: string]: { // quiz id
                            id: string
                            answers: {}
                        }
                    }
                }
            }
        }
        */
    let check = true;
    try {
      check = check && typeof user.id === "string";
      check = check && typeof user.password === "string";
      if (user.quizzes) {
        Object.keys(user.quizzes).forEach((baseLanguage) => {
          check = check && baseLanguage.length === 2;
          Object.keys(user.quizzes[baseLanguage]).forEach((language) => {
            check = check && language.length === 2;
            Object.keys(user.quizzes[baseLanguage][language]).forEach(
              (quiz) => {
                check =
                  check &&
                  typeof user.quizzes[baseLanguage][language][quiz].id ===
                    "string";
                check =
                  check &&
                  typeof user.quizzes[baseLanguage][language][quiz].answers ===
                    "object";
              }
            );
          });
        });
      }
    } catch {
      check = false;
    }
    if (!check) {
      return new Response("Invalid user object", {
        status: 400,
        headers: corsHeaders,
      });
    }

    const repo = "app";
    const owner = "gptlingo";
    const folder = "users";

    // Check if the user already exists
    const checkResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${folder}/${user.id}.json`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${githubAuthorization}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "gptlingo",
        },
      }
    );
    let fileSha = null;
    if (checkResponse.status === 200) {
      const checkData = await checkResponse.json();
      if (user.password !== JSON.parse(atob(checkData.content)).password) {
        return new Response("Invalid password", {
          status: 401,
          headers: corsHeaders,
        });
      }
      fileSha = checkData.sha;
    } else if (checkResponse.status === 404) {
      // do nothing
    } else {
      return new Response("Internal error", {
        status: 500,
        headers: corsHeaders,
      });
    }

    // the filename should be the user id
    const filename = `${user.id}.json`;
    // content should be base64 encoded
    const content = btoa(
      JSON.stringify({
        id: user.id,
        password: user.password,
        quizzes: user.quizzes,
      })
    );
    const message = fileSha ? "Update user" : "Create user";

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${folder}/${filename}`,
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
          sha: fileSha,
        }),
      }
    );

    return new Response(response.body, {
      headers: corsHeaders,
    });
  },
};
