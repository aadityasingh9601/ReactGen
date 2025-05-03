import dotenv from "dotenv";
dotenv.config();

import express from "express";
import OpenAI from "openai";
import { getSystemPrompt } from "./prompt";
import { basePrompt } from "./prompt";
import { nodeBasePrompt } from "./defaults/node";
import { reactBasePrompt } from "./defaults/react";
import { resourceUsage } from "process";

const app = express();

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});

app.use(express.json());

const client = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"], // This is the default and can be omitted
});

app.post("/template", async (req, res) => {
  const userPrompt = req.body.prompt;

  //Send a request to identify if the user wants a react app or node app based on the prompt they've sent us.
  const completion = await client.chat.completions.create({
    model: "gpt-3.5-turbo",
    temperature: 0.2, //Temperature means amount of randomness injected into the response.
    max_completion_tokens: 300,
    messages: [
      {
        role: "user",
        content: `${userPrompt}
              `,
      },
      {
        role: "system",
        content: `Identify is it either react or node project that the user wants. Return either 
            "node" or "react" nothing extra.
            `,
      },
    ],
  });

  const llmRes = completion.choices[0].message.content;
  console.log(llmRes);

  if (llmRes === "react") {
    res.json({
      //These prompts will go the LLM to generate our website.
      prompts: [
        basePrompt,
        `Project Files:\n\nThe following is a list of all project files and their complete contents that are currently visible and accessible to you.${reactBasePrompt}
        Here is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n  - .bolt/prompt'`,
      ],
      //The files that will create the basic structure of our app, these need to run on the UI.
      uiPrompts: [{ reactBasePrompt }],
    });
    return;
  } else if (llmRes === "node") {
    res.json({
      //These prompts will go the LLM to generate our website.
      prompts: [
        basePrompt,
        `Project Files:\n\nThe following is a list of all project files and their complete contents that are currently visible and accessible to you.${nodeBasePrompt}
      Here is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n  - .bolt/prompt'`,
      ],
      //The files that will create the basic structure of our app, these need to run on the UI.
      uiPrompts: [{ nodeBasePrompt }],
    });
    return;
  } else {
    res.status(400).json({
      message: "Something went wrong.",
    });
  }
});

app.post("/chat", async (req, res) => {
  const messages = req.body.messages;
  //console.log(messages);

  const stream = await client.responses.create({
    model: "gpt-3.5-turbo",
    temperature: 0.2,
    max_output_tokens: 10000,
    input: [
      ...messages,
      {
        role: "system",
        content: getSystemPrompt(),
      },
    ],
    stream: true,
  });

  for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
      //console.log(event.delta); It alwasys prints a new line, so we used the method down below.
      process.stdout.write(event.delta);
    }
  }

  res.json({
    message: "received",
  });
  return;
});

// async function main() {
//   //This for sending the request and log the response on the console window.

//   //   const completion = await client.chat.completions.create({
//   //     model: "gpt-3.5-turbo",
//   //     temperature: 0.2, //Temperature means amount of randomness injected into the response.
//   //     max_completion_tokens: 300,
//   //     messages: [
//   //       {
//   //         role: "user",
//   //         content: `what is 2+2?
//   //           `,
//   //       },
//   //     ],
//   //   });

//   //   console.log(completion.choices[0].message.content);
//   //   console.log(completion.usage?.total_tokens);

//   //This is for streaming our responses.

//   const stream = await client.responses.create({
//     model: "gpt-3.5-turbo",
//     temperature: 0.2,
//     max_output_tokens: 10000,
//     input: [
//       {
//         role: "user",
//         content: basePrompt,
//       },
//       {
//         role: "user",
//         content: `Project Files:\n\nThe following is a list of all project files and their complete contents that are currently visible and accessible to you.${basePrompt}
//         Here is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n  - .bolt/prompt';
// `,
//       },
//       {
//         role: "user",
//         content:
//           "create a basic todo app in react\n\n<-- M391YLV6GngX3Myc2iwMX9lI -->\n\n<-- nwALEkrNSi94GUCOHmx2oDnY -->\n\n### Additional Context ###\n\n<bolt_running_commands>\n</bolt_running_commands>\n\nFile Changes:\n\nHere is a list of all files that have been modified since the start of the conversation.\nThis information serves as the true contents of these files!\n\nThe contents include either the full file contents or a diff (when changes are smaller and localized).\n\nUse it to:\n - Understand the latest file modifications\n - Ensure your suggestions build upon the most recent version of the files\n - Make informed decisions about changes\n - Ensure suggestions are compatible with existing code\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - /home/project/.bolt/config.json",
//       },
//       {
//         role: "system",
//         content: getSystemPrompt(),
//       },
//     ],
//     stream: true,
//   });

//   for await (const event of stream) {
//     if (event.type === "response.output_text.delta") {
//       //console.log(event.delta); It alwasys prints a new line, so we used the method down below.
//       process.stdout.write(event.delta);
//     }
//   }
// }

//main();
