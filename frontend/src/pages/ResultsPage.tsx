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
import StreamParser from "../utils/streaming";

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

  const [panelSizes, setPanelSizes] = useState({ left: 35, right: 65 });
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("code");
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answer, setAnswer] = useState("");
  const [collectedBlocks, setCollectedBlocks] = useState<string[]>([]);

  // async function llmResponse(prompts: any) {
  //   // Create the parser as a local variable
  //   const parser = new StreamParser();

  //   const response = await fetch(`${BACKEND_URL}/chat`, {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({ messages: prompts }),
  //   });

  //   if (!response.ok || !response.body) {
  //     throw new Error("Failed to get response stream");
  //   }

  //   const reader = response.body.getReader();
  //   const decoder = new TextDecoder();

  //   try {
  //     // Store all found tags in this local array for debugging
  //     const allFoundTags: string[] = [];

  //     console.log("Starting stream processing...");

  //     while (true) {
  //       const { value, done } = await reader.read();
  //       if (done) {
  //         console.log("Stream complete");
  //         break;
  //       }

  //       const chunk = decoder.decode(value, { stream: true });

  //       // Log chunk for debugging (first 50 chars)
  //       console.log(
  //         `Received chunk (${chunk.length} chars): ${chunk.slice(0, 50)}`
  //       );

  //       // Process the chunk
  //       const extractedTags = parser.processChunk(chunk);

  //       if (extractedTags.length > 0) {
  //         console.log(
  //           `Found ${extractedTags.length} complete tags in this chunk`
  //         );

  //         // Add to our debug array
  //         allFoundTags.push(...extractedTags);
  //         console.log(allFoundTags);

  //         // Update React state with the new tags
  //         setCollectedBlocks((prev) => [...prev, ...extractedTags]);
  //       }
  //     }

  //     console.log(`Total tags found: ${allFoundTags.length}`);

  //     // Debug: check if any tags were found
  //     if (allFoundTags.length === 0) {
  //       console.warn("No tags were found in the entire stream!");
  //       // Debug output the first 100 chars received to check format
  //       console.log("Parser state:", parser.getState());
  //     }
  //   } catch (err) {
  //     console.error("Stream processing error:", err);
  //   }
  // }

  async function llmResponse(prompts: any) {
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
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // ✅ Extract full <boltAction> blocks first
      const blockRegex = /<boltAction\b[^>]*>([\s\S]*?)<\/boltAction>/g;
      let match;

      while ((match = blockRegex.exec(buffer)) !== null) {
        const fullBlock = match[0];
        handleBoltAction(fullBlock); // 🔁 Call your handler
        buffer = buffer.slice(blockRegex.lastIndex);
        blockRegex.lastIndex = 0; // reset because buffer changed
      }

      // ✅ Optionally extract full <boltArtifact> too
      // const artifactMatch = buffer.match(/<boltArtifact\b[^>]*>[\s\S]*?<\/boltArtifact>/);
      // if (artifactMatch) {
      //   const fullArtifact = artifactMatch[0];
      //   handleBoltArtifact(fullArtifact); // ⛏ do something useful
      //   buffer = buffer.replace(fullArtifact, ""); // clear from buffer
      // }
    }
  }

  function handleBoltAction(data: string) {
    console.log("triggered");
    console.log(data);
    setCollectedBlocks((prev) => [...prev, data]);
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

    //Update the steps state variable.

    const parsedData = generateSteps(uiPrompts[0]);
    setSteps(
      parsedData.map((step) => {
        return { ...step, completed: true };
      })
    );

    //console.log(parsedData);
    llmResponse(LLMprompts);

    //Also, update the files state variable only after steps in being updated properly.
  }

  const intervalFunc = () => {
    // setCurrentStep((prev) => {
    //   if (prev < steps?.length) {
    //     setSteps((steps) =>
    //       steps.map((step) =>
    //         step.id === prev + 1 ? { ...step, completed: true } : step
    //       )
    //     );
    //     return prev + 1;
    //   }
    //   return prev;
    // });
    console.log("I am interval function.");
  };

  useEffect(() => {
    //First of all get the template from the backend according to the user's prompt.
    getTemplate();

    //Then, send request to the LLM with the template and other information to generate other files too.
  }, []);

  useEffect(() => {
    const generatedFiles = steps
      ?.filter((step) => step.type === "file")
      .map((step) => ({
        type: step.type,
        path: step.title,
        content: step.code,
      }));

    //console.log(generatedFiles);

    setFiles(generatedFiles);

    if (generatedFiles.length > 0) {
      setSelectedFile(generatedFiles[0]);
    }
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

  const toggleExpand = (stepId: string) => {
    setSteps(
      steps.map((step) =>
        step.id === stepId ? { ...step, expanded: !step.expanded } : step
      )
    );
  };

  return (
    <>
      <div className="bg-blue-300">{JSON.stringify(collectedBlocks)}</div>
      {/* <div className="bg-blue-300">{JSON.stringify(answer)}</div> */}
      {/* <div className="bg-blue-200">{JSON.stringify(answer)}</div> */}
      <div className="h-[calc(100vh-64px)] overflow-hidden">
        <div
          id="results-container"
          className="flex h-full"
          style={{ cursor: isDragging ? "col-resize" : "auto" }}
        >
          {/* Left panel: Execution Steps & Files Overview */}
          <div
            className="bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-y-auto"
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

            <ExecutionSteps
              steps={steps}
              currentStep={currentStep}
              toggleExpand={toggleExpand}
              intervalFunc={intervalFunc}
            />
            <div className="flex px-4 rounded-md">
              <textarea
                placeholder="Follow up prompts"
                value={followUpPrompt}
                onChange={(e) => {
                  setfollowUpPrompt(e.target.value);
                }}
                className="w-full"
              ></textarea>
              <button
                className=" bg-blue-200 px-2"
                onClick={() => {
                  //Add further logic here to ask follow up questions.
                  //The new message that gets created here, also need to be added to the llm messages, so that
                  //we can just send request to the LLM with that and it responds properly to our follow up
                  //prompts and changes.
                  const newMessage = {
                    role: "user",
                    content: followUpPrompt,
                  };

                  //Send the old message plus the new message also.
                  llmResponse([...llmMessages, newMessage]);

                  //Update the llmMessages for further requests.
                  setllmMessages((prevM) => {
                    return [...prevM, newMessage];
                  });
                }}
              >
                Send
              </button>
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
              <div className="w-72 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto">
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
                <div className="flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
                    <Preview webContainer={webContainer} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResultsPage;
