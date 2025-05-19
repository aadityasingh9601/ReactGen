import {
  Step,
  FileData,
  WebContainerStructure,
  WebContainerDirectory,
  FolderStructure,
} from "../types";

import JSZip from "jszip";

export function generateSteps(data: string): Step[] {
  if (typeof data !== "string") {
    console.warn("Expected a string but got:", typeof data);
    return [];
  }

  const steps: Step[] = [];
  const artifactMatch = data.match(/<boltArtifact[^>]*title="([^"]+)"[^>]*>/);
  const artifactTitle = artifactMatch ? artifactMatch[1] : "Project Files";

  const actionRegex =
    /<boltAction\s+type="(file|dependency|command|shell)"(?:\s+filePath="([^"]+)")?>\s*([\s\S]*?)<\/boltAction>/g;

  let match;

  while ((match = actionRegex.exec(data)) !== null) {
    let [_, type, filePath, content] = match;

    // Normalize "shell" to "command"
    if (type === "shell") {
      type = "command";
    }

    steps.push({
      id: crypto.randomUUID(),
      title: filePath?.trim() || `${type.toUpperCase()} Step`,
      description: artifactTitle,
      type: type as Step["type"],
      icon: null,
      completed: false,
      expanded: false,
      code: content
        .trim()
        .replace(/^```[a-z]*\n?/, "") // remove starting ```tsx or ```js
        .replace(/\n?```$/, ""), // remove ending ```,
    });
  }

  return steps;
}

export function convertToWebContainerStructure(
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
      currentLevel = (currentLevel[segment] as WebContainerDirectory).directory;
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

export async function downloadFiles(files: FileData[]) {
  if (!files.length) return;

  //Create instance to download files in zip format.
  const zip = new JSZip();

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

export const createFolderStructure = (files: FileData[]): FolderStructure => {
  const structure: FolderStructure = {};
  //console.log(files);

  files.forEach((file) => {
    const parts = file.path.split("/");

    if (parts[0] === "") {
      parts.shift();
    }

    let current = structure;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part] as FolderStructure;
    }

    const fileName = parts[parts.length - 1];
    if (!current[fileName]) {
      current[fileName] = [];
    }
    (current[fileName] as FileData[]).push(file);
  });

  return structure;
};
