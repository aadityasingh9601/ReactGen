"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const openai_1 = __importDefault(require("openai"));
const client = new openai_1.default({
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
