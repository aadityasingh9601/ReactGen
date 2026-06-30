# ReactGen: AI-Powered React Website Builder

ReactGen is an AI-powered website builder that lets you generate, edit, and preview production-ready React websites directly in your browser—no server or cloud compute required. Describe your idea, and ReactGen instantly creates a complete, beautiful React project you can explore, edit, and run in real time.

## Features

- **AI Website Generation**: Describe your website in plain English. ReactGen uses AI (OpenAI GPT) to generate a full React project tailored to your prompt.
- **Streaming Responses**: See your project structure and code appear in real time as the AI generates it.
- **Monaco Editor**: Edit any file instantly with a powerful, VS Code-like code editor in the browser.
- **WebContainers**: Run and preview your React app live, fully in-browser, using [WebContainers](https://webcontainers.io/). No server or VM required.
- **Interactive Terminal**: Install dependencies and run scripts in a real terminal, powered by WebContainers and xterm.js.
- **File Explorer**: Browse and manage your project files and folders visually.
- **Execution Steps**: Visualize each step of the project setup and code generation process.
- **No Extra Compute Needed**: Everything runs in your browser—no backend server or cloud VM is required to build or preview your site.

## How It Works

1. **Prompt**: Enter a description of the website you want (e.g., "A beautiful portfolio site with a blog and contact form").
2. **AI Generation**: The backend sends your prompt to OpenAI, determines the project type (React or Node), and streams back a project template and setup steps.
3. **Project Structure**: The frontend displays the generated files, setup steps, and code in real time.
4. **Edit**: Use the Monaco editor to tweak any file. Changes are reflected instantly.
5. **Preview**: The app runs your project in-browser using WebContainers, so you can see your site live as you edit.
6. **Terminal**: Install dependencies or run scripts interactively in a real terminal session.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Editor**: Monaco Editor (@monaco-editor/react)
- **Live Preview & Terminal**: WebContainers (@webcontainer/api), xterm.js
- **Icons**: Lucide React
- **Backend**: Node.js, Express, OpenAI API

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm
- OpenAI API key (for backend)

### Setup

#### 1. Clone the repository
```bash
 git clone https://github.com/aadityasingh9601/ReactGen.git
```

#### 2. Install dependencies

- **Backend**
  ```bash
  cd backend
  npm install
  ```
- **Frontend**
  ```bash
  cd ../frontend
  npm install
  ```

#### 3. Configure environment variables
- In `backend`, create a `.env` file with your OpenAI API key:
  ```env
  OPENAI_API_KEY=your-openai-key-here
  ```

#### 4. Run the app
- **Start the backend**
  ```bash
  cd backend
  npm run dev
  ```
- **Start the frontend**
  ```bash
  cd ../frontend
  npm run dev
  ```

- The frontend will be available at [http://localhost:5173](http://localhost:5173).
- The backend runs on [http://localhost:3000](http://localhost:3000).

## Usage

1. Open the app in your browser.
2. Enter a prompt describing your desired website.
3. Watch as ReactGen generates your project structure and code in real time.
4. Explore and edit files using the Monaco editor.
5. Use the built-in terminal to install packages or run scripts.
6. Preview your site live—no deploy or server required!

## Project Structure

- `frontend/` — React app (UI, editor, preview, file explorer, etc.)
- `backend/` — Express server (handles AI prompt, project type detection, and OpenAI API calls)

## Contributing
Pull requests and issues are welcome! Please open an issue to discuss your idea or bug before submitting a PR.

## License
[MIT](LICENSE)
