import dotenv from "dotenv";
dotenv.config();

import express from "express";
import OpenAI from "openai";
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
  })
);

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env["OPENROUTER_API_KEY"],
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:5173",
    "X-Title": "ReactGen",
  },
});

const FREE_MODELS = {
  template: [
    "openai/gpt-oss-20b:free",
    "poolside/laguna-xs.2:free",
    "nvidia/nemotron-nano-9b-v2:free",
  ],
  chat: [
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "openai/gpt-oss-120b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
    "poolside/laguna-m.1:free",
    "cohere/north-mini-code:free",
  ],
};

async function createCompletionWithFallback<T>(
  modelList: string[],
  requestBuilder: (model: string) => Promise<T>
): Promise<T> {
  for (const model of modelList) {
    try {
      return await requestBuilder(model);
    } catch (error: any) {
      console.error(`Model ${model} failed:`, error.message);
      continue;
    }
  }
  throw new Error("All models failed");
}

app.post("/template", async (req, res) => {
  const userPrompt = req.body.prompt;

  const completion = await createCompletionWithFallback(
    FREE_MODELS.template,
    (model) =>
      client.chat.completions.create({
        model,
        temperature: 0.2,
        max_tokens: 300,
        messages: [
          { role: "user", content: userPrompt },
          {
            role: "system",
            content: `Identify is it either react or node project that the user wants. Return either "node" or "react" nothing extra.`,
          },
        ],
      })
  );

  const llmRes = completion.choices[0].message.content;
  console.log(llmRes);

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
  const messages = req.body.messages;
  console.log(messages);

  res.writeHead(200, {
    "Content-Type": "text/plain",
    "Transfer-Encoding": "chunked",
  });

  try {
    const stream = await createCompletionWithFallback(
      FREE_MODELS.chat,
      (model) =>
        client.chat.completions.create({
          model,
          temperature: 0.2,
          max_tokens: 10000,
          messages: [
            ...messages,
            {
              role: "system",
              content: getSystemPrompt(),
            },
          ],
          stream: true,
        })
    );

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        console.log(delta);
        res.write(delta);
        process.stdout.write(delta);
      }
    }
  } catch (error) {
    console.error("All chat models failed:", error);
    res.write(
      "Error: All AI models are currently unavailable. Please try again later."
    );
  }

  res.end();
  return;
});

app.listen(3000, () => {
  console.log("Listening on port 3000");
});
