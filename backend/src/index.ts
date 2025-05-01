import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"], // This is the default and can be omitted
});

async function main() {
  const completion = await client.chat.completions.create({
    // model: "gpt-3.5-turbo",
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: `what is 2+2?
          `,
      },
    ],
  });

  console.log(completion.choices[0].message.content);
}

main();
