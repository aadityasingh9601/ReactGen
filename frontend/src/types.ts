export interface FileData {
  path: string;
  content?: string;
  type: "file" | "dependency" | "command";
}

export interface Step {
  id: string;
  title: string;
  description: string;
  type: "file" | "dependency" | "command";
  icon: React.ReactNode;
  completed: boolean;
  expanded?: boolean;
  code?: string;
}

export interface WebContainerFile {
  file: {
    contents: string;
  };
}

export interface WebContainerDirectory {
  directory: Record<string, WebContainerFile | WebContainerDirectory>;
}

export type WebContainerStructure = Record<
  string,
  WebContainerFile | WebContainerDirectory
>;

export interface CodeViewerProps {
  file: FileData;
  onContentChange?: (content: string) => void;
}

export interface ExecutionStepsProps {
  steps: Step[];
  currentStep: any;
}

export interface FileExplorerProps {
  files: FileData[];
  selectedFile: FileData | null;
  onSelectFile: (file: FileData) => void;
}

export interface FolderStructure {
  [key: string]: FolderStructure | FileData[];
}
