import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { OpenRouter } from "@openrouter/sdk";
import { getSystemPrompt } from "./prompt";
import { basePrompt } from "./prompt";
import { nodeBasePrompt } from "./defaults/node";
import { reactBasePrompt } from "./defaults/react";
import cors from "cors";

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["POST", "PATCH", "GET", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: ["*"],
    credentials: true,
  }),
);

const REQUEST_TIMEOUT = 30000;

const client = new OpenRouter({
  apiKey: process.env["OPENROUTER_API_KEY_4"],
  timeoutMs: REQUEST_TIMEOUT,
  httpReferer: "http://localhost:5173",
  appTitle: "ReactGen",
  retryConfig: { strategy: "none" },
});

(async () => {
  try {
    const keyInfo = await client.apiKeys.getCurrentKeyMetadata();
    console.log("OpenRouter API Key Info:", JSON.stringify(keyInfo, null, 2));
  } catch (err) {
    console.error("Failed to get OpenRouter API key info:", err);
  }
})();

const FREE_MODELS = {
  template: [
    "openai/gpt-oss-20b:free",
    "poolside/laguna-xs.2:free",
    "nvidia/nemotron-nano-9b-v2:free",
  ],
  chat: [
    "openai/gpt-oss-120b:free",
    "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free",
    "poolside/laguna-m.1:free",
    "cohere/north-mini-code:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
  ],
};

async function createCompletionWithFallback<T>(
  modelList: string[],
  requestBuilder: (model: string) => Promise<T>,
): Promise<T> {
  for (const model of modelList) {
    try {
      return await requestBuilder(model);
    } catch (error: any) {
      const message = error.message || error;
      console.error(`Model ${model} failed:`, message);
      if (error.name === "AbortError") {
        console.error("Request timed out");
      }
      continue;
    }
  }
  throw new Error("All models failed");
}

app.post("/template", async (req, res) => {
  console.log("inside template endpoint");
  const userPrompt = req.body.prompt;
  console.log("UserPrompt", userPrompt);

  const completion = await createCompletionWithFallback(
    FREE_MODELS.template,
    (model) =>
      client.chat.send({
        chatRequest: {
          model,
          temperature: 0.2,
          maxTokens: 300,
          messages: [
            {
              role: "system",
              content: `Identify the userPrompt as either react or node project that the user wants. Return either "node" or "react" in your response nothing extra. Return a one-word response only, nothing else.`,
            },
            { role: "user", content: userPrompt },
          ],
        },
      }),
  );

  const llmRes = (completion as any).choices[0].message.content;
  console.log("llmRes", llmRes);

  if (llmRes === "react") {
    res.json({
      prompts: [
        basePrompt,
        `Project Files:\n\nThe following is a list of all project files and their complete contents that are currently visible and accessible to you.${reactBasePrompt}
        Here is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n  - .bolt/prompt'`,
      ],
      uiPrompts: [reactBasePrompt],
    });
    return;
  } else if (llmRes === "node") {
    res.json({
      prompts: [
        basePrompt,
        `Project Files:\n\nThe following is a list of all project files and their complete contents that are currently visible and accessible to you.${nodeBasePrompt}
      Here is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n  - .bolt/prompt'`,
      ],
      uiPrompts: [nodeBasePrompt],
    });
    return;
  } else {
    res.status(400).json({ message: "Something went wrong." });
  }
});

app.post("/chat", async (req, res) => {
  console.log("inside chat endpoint");
  const messages = req.body.messages;
  console.log(messages);
  const startTime = Date.now();
  console.log("Received messages count:", messages.length);

  res.writeHead(200, {
    "Content-Type": "text/plain",
    "Transfer-Encoding": "chunked",
  });

  try {
    const completion = await createCompletionWithFallback(
      FREE_MODELS.chat,
      async (model) => {
        console.log(`[${new Date().toISOString()}] Trying model: ${model}`);
        const result = await client.chat.send({
          chatRequest: {
            model,
            temperature: 0.2,
            maxTokens: 4096,
            messages: [
              ...messages,
              {
                role: "system",
                content: getSystemPrompt(),
              },
            ],
            stream: true,
          },
        });
        console.log(result);
        console.log(`[${new Date().toISOString()}] Model ${model} succeeded`);
        return result;
      },
    );

    for await (const chunk of completion) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        //console.log(content);
        res.write(content);
      }
      // Final chunk includes usage stats
      if (chunk.usage) {
        console.log("Usage:", chunk.usage);
      }
    }

    console.log(`Total time: ${Date.now() - startTime}ms`);
  } catch (error: any) {
    console.error("All chat models failed:", error?.message || error);
    res.write(
      "Error: All AI models are currently unavailable. Please try again later.",
    );
  }

  res.end();
  return;
});

app.listen(3000, () => {
  console.log("Listening on port 3000");
});
