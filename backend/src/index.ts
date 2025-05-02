import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";
import { getSystemPrompt } from "./prompt";
import { basePrompt } from "./defaults/node";

const client = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"], // This is the default and can be omitted
});

async function main() {
  //This for sending the request and log the response on the console window.

  //   const completion = await client.chat.completions.create({
  //     model: "gpt-3.5-turbo",
  //     temperature: 0.2, //Temperature means amount of randomness injected into the response.
  //     max_completion_tokens: 300,
  //     messages: [
  //       {
  //         role: "user",
  //         content: `what is 2+2?
  //           `,
  //       },
  //     ],
  //   });

  //   console.log(completion.choices[0].message.content);
  //   console.log(completion.usage?.total_tokens);

  //This is for streaming our responses.

  const stream = await client.responses.create({
    model: "gpt-3.5-turbo",
    temperature: 0.2,
    max_output_tokens: 10000,
    input: [
      {
        role: "user",
        content: `For all designs I ask you to make, have them be beautiful, not cookie cutter. Make webpages that are 
        fully featured and worthy for production.\n\nBy default, this template supports JSX syntax with Tailwind CSS 
        classes, React hooks, and Lucide React for icons. Do not install other packages for UI themes, icons, etc 
        unless absolutely necessary or I request them.\n\nUse icons from lucide-react for logos.`,
      },
      {
        role: "user",
        content: `Project Files:\n\nThe following is a list of all project files and their complete contents that are currently visible and accessible to you.${basePrompt}`,
      },
      {
        role: "user",
        content:
          "create a basic todo app in react\n\n<-- M391YLV6GngX3Myc2iwMX9lI -->\n\n<-- nwALEkrNSi94GUCOHmx2oDnY -->\n\n### Additional Context ###\n\n<bolt_running_commands>\n</bolt_running_commands>\n\nFile Changes:\n\nHere is a list of all files that have been modified since the start of the conversation.\nThis information serves as the true contents of these files!\n\nThe contents include either the full file contents or a diff (when changes are smaller and localized).\n\nUse it to:\n - Understand the latest file modifications\n - Ensure your suggestions build upon the most recent version of the files\n - Make informed decisions about changes\n - Ensure suggestions are compatible with existing code\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - /home/project/.bolt/config.json",
      },
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
}

main();
