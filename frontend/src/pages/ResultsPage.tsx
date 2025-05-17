import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import FileExplorer from "../components/FileExplorer";
import ExecutionSteps from "../components/ExecutionSteps";
import CodeViewer from "../components/CodeViewer";
import { FileData } from "../types";
import { generateMockFiles } from "../utils/mockData";
import { Code, Globe } from "lucide-react";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { generateSteps } from "../utils/generateSteps";
import { useWebContainer } from "../hooks/useWebContainer";
import Preview from "../components/Preview";
import { Download } from "lucide-react";
import JSZip from "jszip";
import TerminalComponent from "../components/TerminalComponent";
import { Rnd } from "react-rnd";

// Important for resize handles

type Tab = "code" | "preview";

interface Step {
  id: string;
  title: string;
  description: string;
  type: "file" | "dependency" | "command";
  icon: React.ReactNode;
  completed: boolean;
  expanded?: boolean;
  code?: string;
}

const ResultsPage: React.FC = () => {
  console.log("rendered");
  const webContainer = useWebContainer();
  //Create instance to download files in zip format.
  const zip = new JSZip();

  const location = useLocation();
  // console.log(location);
  const [files, setFiles] = useState<FileData[]>([]);
  //console.log(files);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [prompt, setPrompt] = useState(location.state);
  const [followUpPrompt, setfollowUpPrompt] = useState("");
  const [llmMessages, setllmMessages] = useState<
    { role: string; content: any }[]
  >([]);
  //These contains all the messages that we've to send to the LLM, as llm sends responses from it's side, we
  //also have to add them in llmMessages so that we can ask follow up questions and ask it to make some changes
  //to our website.
  //role:"assistant" will be used when we add the LLM's response in the message.
  //As user keep asking follow up prompts, we'll keep adding them to the llmMessages, so that llm can respond
  //accordingly and give you proper responses.
  //console.log(prompt);

  const [panelSizes, setPanelSizes] = useState({ left: 25, right: 75 });
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("code");
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [llmResponse, setllmResponse] = useState<String>();
  const [url, setUrl] = useState("");
  // const [collectedBlocks, setCollectedBlocks] = useState<string[]>([]);
  const [currentFilePath, setCurrentFilePath] = useState<any>();

  useEffect(() => {
    if (!currentFilePath) return;

    const file = files.find((f) => f.path === currentFilePath);
    if (file) {
      handleFileSelect(file);
    }
  }, [files, currentFilePath]);

  async function downloadFiles() {
    if (!files.length) return;

    files.forEach((file) => {
      zip.file(file.path, file.content || "");
    });

    const blob = await zip.generateAsync({ type: "blob" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "project-files.zip";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function getLLMResponse(prompts: any) {
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
    let buffer2 = "";
    const reader = response.body.getReader();
    let currentFilePath: string = "";
    const decoder = new TextDecoder();
    let insideBoltAction = false;
    let codeAccumulator = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer2 += decoder.decode(value, { stream: true });
      buffer += decoder.decode(value, { stream: true });

      // 1. Process <boltAction> start tags
      const startTagRegex = /<boltAction\s+type="file"\s+filePath="([^"]+)">/;
      const startTagMatch = buffer.match(startTagRegex);

      if (startTagMatch && !insideBoltAction) {
        insideBoltAction = true;
        currentFilePath = startTagMatch[1];
        codeAccumulator = ""; // Reset code accumulator for new file

        setSteps((prevSteps) => {
          const newStep: Step = {
            id: crypto.randomUUID(),
            title: currentFilePath,
            description: "Streaming file",
            type: "file",
            icon: null,
            completed: false,
            expanded: false,
            code: "",
          };

          const stepExists = prevSteps.some(
            (step) => step.title === currentFilePath
          );

          if (stepExists) {
            return prevSteps.map((step) =>
              step.title === currentFilePath ? newStep : step
            );
          }

          return [...prevSteps, newStep];
        });

        setCurrentFilePath(currentFilePath);

        // Remove the start tag from buffer
        buffer = buffer.slice(startTagMatch.index! + startTagMatch[0].length);
      }

      // 2. Process </boltAction> end tags
      const endTagMatch = buffer.match(/([\s\S]*?)<\/boltAction>/);

      if (insideBoltAction && endTagMatch && currentFilePath) {
        const codeChunk = endTagMatch[1];

        // Add the final chunk to our accumulator
        codeAccumulator += codeChunk;

        // Clean any remaining tag content that might be in the code
        const cleanedCode = cleanBoltActionTags(codeAccumulator);

        // Update the step with the complete code
        setSteps((prevSteps) =>
          prevSteps.map((step) =>
            step.title === currentFilePath
              ? {
                  ...step,
                  code: cleanedCode, // Use cleaned code
                  completed: true,
                }
              : step
          )
        );

        // Clean up state and buffer
        buffer = buffer.slice(endTagMatch.index! + endTagMatch[0].length);
        insideBoltAction = false;
        currentFilePath = "";
        codeAccumulator = "";
        continue;
      }

      // 3. Accumulate code chunks while inside <boltAction>
      if (insideBoltAction && currentFilePath) {
        // Look for potential closing tag fragments
        const closingTagIndex = buffer.indexOf("</boltAction");

        if (closingTagIndex >= 0) {
          // If we find part of a closing tag, only take content before it
          const safeContent = buffer.slice(0, closingTagIndex);
          codeAccumulator += safeContent;
          buffer = buffer.slice(closingTagIndex); // Keep potential tag for next iteration
        } else {
          // No closing tag fragment, safe to accumulate all buffer
          codeAccumulator += buffer;
          buffer = "";
        }

        // Clean any bolt action tags that might appear in the accumulated content
        const cleanedAccumulator = cleanBoltActionTags(codeAccumulator);

        // Update the step with accumulated code so far
        setSteps((prevSteps) =>
          prevSteps.map((step) =>
            step.title === currentFilePath
              ? {
                  ...step,
                  code: cleanedAccumulator,
                }
              : step
          )
        );
      }
    }

    setllmResponse(buffer2);

    //Marked all as completed once finished.
    setSteps((prevSteps) =>
      prevSteps.map((step) => {
        return { ...step, completed: true };
      })
    );

    setllmMessages((x) => {
      return [
        ...x,
        {
          role: "assistant",
          content: buffer2,
        },
      ];
    });
  }

  function cleanBoltActionTags(code: string): string {
    return code
      .replace(/^```[\w\d]*\s*\n?/gm, "") // Markdown start fences
      .replace(/\n?```\s*$/gm, "") // Markdown end fences
      .replace(/```[\w\d]*\s*\n?/g, "") // Fences in middle
      .replace(/\n?```/g, "")
      .replace(/<boltAction\s+[^>]*>/g, "") // <boltAction ...>
      .replace(/<\/boltAction>/g, "")
      .replace(/<boltAction>/g, "")
      .replace(/<\/boltAction>/g, "")
      .replace(/<boltArtifact>/g, "")
      .replace(/<boltArtifact>/g, "")
      .replace(/\b(npm\s+run\s+dev)\b/g, ""); // Unwanted leftover commands
  }

  function setPreviewUrl(url: string) {
    setUrl(url);
    //Navigate to the preveiw tab as soon as our website is ready.
    setActiveTab("preview");
  }

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
      })
    );

    //console.log(parsedData);
    getLLMResponse(LLMprompts);

    //Also, update the files state variable only after steps in being updated properly.
  }

  useEffect(() => {
    //First of all get the template from the backend according to the user's prompt.
    getTemplate();

    //Then, send request to the LLM with the template and other information to generate other files too.
  }, []);

  useEffect(() => {
    //console.log("triggered Set files");
    const generatedFiles = steps
      ?.filter((step) => step.type === "file")
      .map((step) => ({
        type: step.type,
        path: step.title,
        content: step.code,
      }));

    //console.log(generatedFiles);

    setFiles(generatedFiles);

    //It's causing conflictin while streaming and selecting the correct file, so comment this out.
    // if (generatedFiles.length > 0) {
    //   setSelectedFile(generatedFiles[0]);
    // }
  }, [steps]);

  interface WebContainerFile {
    file: {
      contents: string;
    };
  }

  interface WebContainerDirectory {
    directory: Record<string, WebContainerFile | WebContainerDirectory>;
  }

  type WebContainerStructure = Record<
    string,
    WebContainerFile | WebContainerDirectory
  >;

  //Run an effect to create the correct folder structure for web containers.
  useEffect(() => {
    const orignalFiles = files;

    function convertToWebContainerStructure(
      files: FileData[]
    ): WebContainerStructure {
      const wcFolderStructure: WebContainerStructure = {};

      files.forEach((fileData) => {
        // Skip non-file entries (dependencies or commands)
        if (fileData.type !== "file") return;

        // Split the path into segments
        const pathSegments = fileData.path.split("/");
        const fileName = pathSegments.pop() || "";

        // Create nested directories and place the file
        let currentLevel = wcFolderStructure;

        // Create directories
        for (let i = 0; i < pathSegments.length; i++) {
          const segment = pathSegments[i];

          // Skip empty segments
          if (!segment) continue;

          // Create directory if it doesn't exist
          if (!currentLevel[segment]) {
            currentLevel[segment] = {
              directory: {},
            };
          }

          // Navigate to the next level
          currentLevel = (currentLevel[segment] as WebContainerDirectory)
            .directory;
        }

        // Add the file at the correct level
        currentLevel[fileName] = {
          file: {
            contents: fileData.content || "",
          },
        };
      });

      return wcFolderStructure;
    }

    const wcFolderStructure = convertToWebContainerStructure(orignalFiles);
    //console.log(wcFolderStructure);

    webContainer?.mount(wcFolderStructure);
  }, [files, webContainer]);

  const handleFileSelect = (file: FileData) => {
    setSelectedFile(file);
    //console.log(file);
    setActiveTab("code");
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const containerRect = document
      .getElementById("results-container")
      ?.getBoundingClientRect();
    if (!containerRect) return;

    const containerWidth = containerRect.width;
    const mouseX = e.clientX - containerRect.left;

    let leftPercentage = (mouseX / containerWidth) * 100;
    leftPercentage = Math.max(20, Math.min(80, leftPercentage));

    setPanelSizes({
      left: leftPercentage,
      right: 100 - leftPercentage,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const handleContentChange = (newContent: string) => {
    if (selectedFile) {
      const updatedFiles = files.map((file) =>
        file.path === selectedFile.path
          ? { ...file, content: newContent }
          : file
      );
      setFiles(updatedFiles);
      setSelectedFile({ ...selectedFile, content: newContent });
    }
  };

  return (
    <>
      {/* <div className="bg-blue-300">{JSON.stringify(llmResponse)}</div> */}

      {/* <div className="bg-blue-200">{JSON.stringify(answer)}</div> */}
      <div className="h-[calc(100vh-64px)] overflow-hidden">
        <div
          id="results-container"
          className="flex h-full relative"
          style={{ cursor: isDragging ? "col-resize" : "auto" }}
        >
          {/* Left panel: Execution Steps & Files Overview */}
          <div
            className="relative bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 "
            style={{ width: `${panelSizes.left}%` }}
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                Generated from prompt:
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mt-1 italic">
                {prompt}
              </p>
            </div>

            <ExecutionSteps steps={steps} currentStep={currentStep} />

            <div className="flex px-4 rounded-md w-full  absolute bottom-0">
              <textarea
                placeholder="Follow up prompts..."
                value={followUpPrompt}
                onChange={(e) => {
                  setfollowUpPrompt(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    //Add further logic here to ask follow up questions.
                    //The new message that gets created here, also need to be added to the llm messages, so that
                    //we can just send request to the LLM with that and it responds properly to our follow up
                    //prompts and changes.
                    const newMessage = {
                      role: "user",
                      content: followUpPrompt,
                    };

                    setfollowUpPrompt("");

                    //Send the old message plus the new message also.
                    getLLMResponse([...llmMessages, newMessage]);

                    //Update the llmMessages for further requests.
                    setllmMessages((prevM) => {
                      return [...prevM, newMessage];
                    });
                    console.log(llmMessages);
                  }
                }}
                className="w-full rounded-md h-20 bg-slate-900 border-grey-100 p-2 text-white resize-none"
              ></textarea>
            </div>
          </div>

          {/* Resizer */}
          <div
            className="w-2 bg-slate-200 dark:bg-slate-700 hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors cursor-col-resize z-10 relative"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-slate-400 dark:bg-slate-500 rounded"></div>
          </div>

          {/* Right panel: File Explorer & Code/Preview Viewer */}
          <div
            className="bg-slate-50 dark:bg-slate-900 flex flex-col"
            style={{ width: `${panelSizes.right}%` }}
          >
            <div className="h-full flex">
              {/* File Explorer sidebar */}
              <div className="w-64 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto">
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

              {/* Code/Preview viewer */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tabs */}
                <div className="flex relative border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
                  {/* Add a download button to download the existing files in the file Explorer, so that we can use
                  them as much as we like. */}
                  <button
                    onClick={() => downloadFiles()}
                    className="absolute flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-400 right-0 hover:text-slate-200"
                  >
                    <Download size={18} />
                    Download files
                  </button>
                </div>

                {/* Content area */}
                <div className="flex-1 overflow-hidden">
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
              </div>
            </div>
          </div>

          <TerminalComponent
            setPreviewUrl={setPreviewUrl}
            webContainer={webContainer}
          />
        </div>
      </div>
    </>
  );
};

export default ResultsPage;
