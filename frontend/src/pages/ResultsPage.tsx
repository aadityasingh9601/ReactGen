import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import FileExplorer from "../components/FileExplorer";
import ExecutionSteps from "../components/ExecutionSteps";
import CodeViewer from "../components/CodeViewer";
import { FileData } from "../types";
import { Code, Globe } from "lucide-react";
import axios from "axios";
import { BACKEND_URL } from "../config";
import {
  generateSteps,
  convertToWebContainerStructure,
  downloadFiles,
} from "../utils";
import { useWebContainer } from "../hooks/useWebContainer";
import Preview from "../components/Preview";
import { Download } from "lucide-react";
import TerminalComponent from "../components/TerminalComponent";
import { Step } from "../types";

// Important for resize handles

type Tab = "code" | "preview";
interface LLMmessage {
  role: string;
  content: string;
}

export default function ResultsPage() {
  const webContainer = useWebContainer();

  const location = useLocation();
  const [files, setFiles] = useState<FileData[]>([]);
  //console.log(files);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [prompt] = useState(() => location.state || sessionStorage.getItem("reactgen_prompt") || "");
  const [followUpPrompt, setfollowUpPrompt] = useState("");
  const [llmMessages, setllmMessages] = useState<LLMmessage[]>([]);
  //These contains all the messages that we've to send to the LLM, as llm sends responses from it's side, we
  //also have to add them in llmMessages so that we can ask follow up questions and ask it to make some changes
  //to our website.
  //role:"assistant" will be used when we add the LLM's response in the message.
  //As user keep asking follow up prompts, we'll keep adding them to the llmMessages, so that llm can respond
  //accordingly and give you proper responses.
  //console.log(prompt);

  const [activeTab, setActiveTab] = useState<Tab>("code");
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStep] = useState(0);
  const [url, setUrl] = useState("");
  // const [collectedBlocks, setCollectedBlocks] = useState<string[]>([]);
  const [currentFilePath, setCurrentFilePath] = useState<string>();

  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [explorerWidth, setExplorerWidth] = useState(240);
  const [terminalHeight, setTerminalHeight] = useState(200);
  const [terminalCollapsed, setTerminalCollapsed] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const hasMounted = useRef(false);
  const syncedFiles = useRef(new Set<string>());
  const [llmComplete, setLlmComplete] = useState(false);
  const [startProcesses, setStartProcesses] = useState(false);
  const [cacheSalt, setCacheSalt] = useState(0);
  const CACHE_PREFIX = "reactgen_cache_";

  const startResize = (e: React.MouseEvent, target: "left" | "explorer") => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = target === "left" ? leftPanelWidth : explorerWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      if (target === "left") {
        setLeftPanelWidth(Math.max(200, Math.min(600, startWidth + delta)));
      } else {
        setExplorerWidth(Math.max(150, Math.min(400, startWidth + delta)));
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleFileSelect = (file: FileData) => {
    setSelectedFile(file);
    setActiveTab("code");
  };

  useEffect(() => {
    if (!currentFilePath) return;

    const file = files.find((f) => f.path === currentFilePath);
    if (file) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleFileSelect(file);
    }
  }, [files, currentFilePath]);

  async function getLLMResponse(prompts: LLMmessage[]) {
    /* eslint-disable react-hooks/immutability */
    setCurrentFilePath(undefined);

    const response = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: prompts }),
    });

    if (!response.ok || !response.body) {
      throw new Error("Failed to get response stream");
    }

    let buffer = "";
    let fullResponse = "";
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    function createOrUpdateStep(
      filePath: string,
      code: string,
      completed: boolean,
    ) {
      setSteps((prev) => {
        const exists = prev.some((s) => s.title === filePath);
        const step: Step = {
          id: crypto.randomUUID(),
          title: filePath,
          description: "Streaming file",
          type: "file",
          icon: null,
          completed,
          expanded: false,
          code,
        };
        if (exists) return prev.map((s) => (s.title === filePath ? step : s));
        return [...prev, step];
      });
      setCurrentFilePath(filePath);
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      fullResponse += text;
      buffer += text;

      // Keep extracting complete file actions until none remain
      while (true) {
        const startTagRegex = /<boltAction\s+type="file"\s+filePath="([^"]+)">/;
        const startMatch = buffer.match(startTagRegex);
        if (!startMatch) break;

        const contentStart = startMatch.index! + startMatch[0].length;
        const endTagStr = "</boltAction>";
        const endIndex = buffer.indexOf(endTagStr, contentStart);

        if (endIndex === -1) {
          // Incomplete — show partial content for live preview
          const rawPartial = buffer.slice(contentStart);

          // Strip incomplete end tag artifacts (e.g. </bol, </boltAction without >)
          const safePartial = rawPartial.replace(
            /<\/(?:bolt(?:Action)?)>?$/g,
            "",
          );

          const cleanedPartial = cleanBoltActionTags(safePartial);
          createOrUpdateStep(startMatch[1], cleanedPartial, false);
          break;
        }

        // Complete file action found
        const rawContent = buffer.slice(contentStart, endIndex);
        const cleanedContent = cleanBoltActionTags(rawContent);
        createOrUpdateStep(startMatch[1], cleanedContent, true);

        // Remove processed content from buffer
        buffer = buffer.slice(endIndex + endTagStr.length);
      }
    }

    // Mark all remaining incomplete steps as completed
    setSteps((prev) => prev.map((s) => ({ ...s, completed: true })));

    setllmMessages((x) => {
      return [
        ...x,
        {
          role: "assistant",
          content: fullResponse,
        },
      ];
    });

    setLlmComplete(true);
    setCacheSalt(v => v + 1);
    setCurrentFilePath(undefined);
    setActiveTab("preview")
    /* eslint-enable react-hooks/immutability */
  }

  //This function cleans up any leftover boltAction tags from the code of a particular file.
  function cleanBoltActionTags(code: string): string {
    return code
      .replace(/^```[\w\d]*\s*\n?/gm, "")
      .replace(/\n?```\s*$/gm, "")
      .replace(/```[\w\d]*\s*\n?/g, "")
      .replace(/\n?```/g, "")
      .replace(/<boltArtifact(?:\s+[^>]*)?>[\s\S]*?<boltAction/g, "<boltAction")
      .replace(/<\/boltAction>[\s\S]*?<\/boltArtifact>/g, "</boltAction>")
      .replace(/<boltAction\s+[^>]*>/g, "")
      .replace(/<\/boltAction>/g, "")
      .replace(/<boltAction>/g, "")
      .replace(/<boltArtifact(?:\s+[^>]*)?>/g, "")
      .replace(/<\/boltArtifact>/g, "")
      .replace(/\b(npm\s+run\s+dev)\b/g, "")
      .trim();
  }

  function setPreviewUrl(url: string) {
    console.log("called preview URL function", url);
    setUrl(url);
    setActiveTab("preview");
  }

  //This function right here is responsible for fetching the template files that are common across all of the react projects
  //so that the LLM won't have to generate these again & again.
  async function getTemplate() {
    const response = await axios.post(`${BACKEND_URL}/template`, {
      prompt: prompt,
    });
    //console.log(response);

    const { prompts, uiPrompts } = response.data;
    //console.log(prompts);
    const LLMprompts = [
      {
        role: "user",
        content: prompt,
      },
      {
        role: "user",
        content: prompts[0],
      },
      {
        role: "user",
        content: prompts[1],
      },
    ];
    console.log(LLMprompts);

    //Update the llmMessages for further respones.
    setllmMessages(LLMprompts);
    console.log(llmMessages);

    //Update the steps state variable.
    const parsedData = generateSteps(uiPrompts[0]);
    setSteps(
      parsedData.map((step) => {
        return { ...step, completed: true };
      }),
    );

    //console.log(parsedData);
    getLLMResponse(LLMprompts);

    //Also, update the files state variable only after steps in being updated properly.
  }

  useEffect(() => {
    if (!prompt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      getTemplate();
      return;
    }
    const cached = localStorage.getItem(CACHE_PREFIX + prompt);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setSteps(parsed.steps);
        setllmMessages(parsed.llmMessages);
        setLlmComplete(true);
        setStartProcesses(true);
        return;
      } catch {
        localStorage.removeItem(CACHE_PREFIX + prompt);
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //Save results to localStorage cache when generation completes.
  useEffect(() => {
    if (cacheSalt === 0 || !prompt) return;
    try {
      const cacheData = {
        prompt,
        steps,
        llmMessages,
        llmComplete: true,
        startProcesses: true,
      };
      localStorage.setItem(CACHE_PREFIX + prompt, JSON.stringify(cacheData));
    } catch {
      console.warn("Failed to cache results to localStorage");
    }
  }, [cacheSalt, prompt, steps, llmMessages, llmComplete, startProcesses]);

  //Update the files once the steps are set.
  useEffect(() => {
    const generatedFiles = steps
      ?.filter((step) => step.type === "file")
      .map((step) => ({
        type: step.type as "file",
        path: step.title,
        content: step.code,
      }));

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFiles(generatedFiles);
  }, [steps]);

  //Run an effect to create the correct folder structure for web containers.
  useEffect(() => {
    if (
      !webContainer ||
      files.length === 0 ||
      hasMounted.current ||
      !llmComplete
    )
      return;

    const doMount = async () => {
      const wcFolderStructure = convertToWebContainerStructure(files);
      await webContainer.mount(wcFolderStructure);
      hasMounted.current = true;
      files.forEach((f) => {
        if (f.type === "file" && f.path) {
          syncedFiles.current.add("/" + f.path);
        }
      });
      setIsMounted(true);
      setStartProcesses(true);
    };
    doMount();
  }, [files, webContainer, llmComplete]);

  //Sync new files to WebContainer after initial mount (LLM-streamed files)
  useEffect(() => {
    //console.log("web container files updating function called");
    if (!webContainer || !hasMounted.current) return;

    files.forEach(async (file) => {
      if (file.type !== "file" || !file.path) return;
      const fullPath = "/" + file.path;
      if (syncedFiles.current.has(fullPath)) return;
      syncedFiles.current.add(fullPath);

      try {
        const dirPath = fullPath.substring(0, fullPath.lastIndexOf("/"));
        if (dirPath) {
          await webContainer.fs
            .mkdir(dirPath, { recursive: true })
            .catch(() => {});
        }
        await webContainer.fs.writeFile(fullPath, file.content || "");
      } catch (error) {
        console.error(`Failed to sync ${file.path}:`, error);
      }
    });
  }, [files, webContainer]);

  //Run processes (npm install, npm run dev) after mount is complete and LLM response is done.
  useEffect(() => {
    if (!webContainer || !startProcesses) return;

    const run = async () => {
      console.log("Starting process execution...");

      webContainer.on("server-ready", (port, url) => {
        console.log("Port ->", port);
        console.log("URL ->", url);
        setPreviewUrl(url);
      });

      console.log("Running npm install...");
      const installProcess = await webContainer.spawn("npm", ["install"]);
      installProcess.output
        .pipeTo(
          new WritableStream({
            write(data) {
              console.log("npm install:", data);
            },
          }),
        )
        .catch(() => {});
      const installExitCode = await installProcess.exit;
      if (installExitCode !== 0) {
        console.error("npm install failed with exit code", installExitCode);
        return;
      }

      console.log("Starting dev server...");

      // Register listener BEFORE spawn to eliminate any race condition

      const server = await webContainer.spawn("npm", ["run", "dev"]);

      // Consume output to prevent backpressure from blocking the process
      server.output
        .pipeTo(
          new WritableStream({
            write(data) {
              console.log("npm run dev:", data);
            },
          }),
        )
        .catch(() => {});

      // Log if the dev server exits unexpectedly
      server.exit.then((code) => {
        console.log("Dev server exited with code", code);
      });
    };

    run().catch((err) => {
      console.error("Process execution error:", err);
    });
  }, [webContainer, startProcesses]);

  //Handles the updates of the code in a file that already exists.
  const handleContentChange = (newContent: string) => {
    if (selectedFile) {
      const updatedFiles = files.map((file) =>
        file.path === selectedFile.path
          ? { ...file, content: newContent }
          : file,
      );
      setFiles(updatedFiles);
      setSelectedFile({ ...selectedFile, content: newContent });
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden">
      <div id="results-container" className="flex h-full">
        {/* Left panel: Execution Steps & Files Overview */}
        <div
          className="relative bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex-shrink-0 overflow-hidden h-full flex flex-col"
          style={{ width: leftPanelWidth }}
        >
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              Generated from prompt:
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mt-1 italic line-clamp-2">
              {prompt}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <ExecutionSteps steps={steps} currentStep={currentStep} />
          </div>

          <div className="px-4 py-2 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
            <textarea
              placeholder="Follow up prompts..."
              value={followUpPrompt}
              onChange={(e) => {
                setfollowUpPrompt(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const newMessage = {
                    role: "user",
                    content: followUpPrompt,
                  };

                  setfollowUpPrompt("");

                  getLLMResponse([...llmMessages, newMessage]);

                  setllmMessages((prevM) => {
                    return [...prevM, newMessage];
                  });
                  console.log(llmMessages);
                }
              }}
              className="w-full rounded-md h-[72px] bg-slate-900 p-2 text-white resize-none text-sm"
            ></textarea>
          </div>
        </div>

        {/* Resizer 1 */}
        <div
          className="w-[4px] bg-slate-200 dark:bg-slate-700 hover:bg-blue-500 cursor-col-resize flex-shrink-0 transition-colors"
          onMouseDown={(e) => startResize(e, "left")}
        />

        {/* File Explorer sidebar */}
        <div
          className="border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto flex-shrink-0 h-full"
          style={{ width: explorerWidth }}
        >
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              File Explorer
            </h2>
          </div>
          <FileExplorer
            files={files}
            selectedFile={selectedFile}
            onSelectFile={handleFileSelect}
          />
        </div>

        {/* Resizer 2 */}
        <div
          className="w-[4px] bg-slate-200 dark:bg-slate-700 hover:bg-blue-500 cursor-col-resize flex-shrink-0 transition-colors"
          onMouseDown={(e) => startResize(e, "explorer")}
        />

        {/* Code/Preview + Terminal */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 min-w-0 h-full">
          {/* Tabs */}
          <div className="flex relative border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
            <button
              onClick={() => setActiveTab("code")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "code"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Code size={16} />
              Code
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "preview"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Globe size={16} />
              Preview
            </button>
            <button
              onClick={() => downloadFiles(files)}
              className="absolute flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-400 right-0 hover:text-slate-200"
            >
              <Download size={18} />
              Download files
            </button>
          </div>

          {/* Code/Preview content */}
          <div className="flex-1 overflow-hidden min-h-0">
            {activeTab === "code" ? (
              selectedFile ? (
                <CodeViewer
                  file={selectedFile}
                  onContentChange={handleContentChange}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                  <p>Select a file to view its contents</p>
                </div>
              )
            ) : (
              <Preview url={url} />
            )}
          </div>

          {/* Terminal — inline in layout, no more absolute positioning */}
          <TerminalComponent
            height={terminalHeight}
            onHeightChange={setTerminalHeight}
            collapsed={terminalCollapsed}
            onToggleCollapse={() => setTerminalCollapsed((c) => !c)}
          />
        </div>
      </div>
    </div>
  );
}
