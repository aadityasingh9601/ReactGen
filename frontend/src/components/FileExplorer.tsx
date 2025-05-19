import { File, Folder } from "lucide-react";
import { FileExplorerProps, FolderStructure } from "../types";
import { createFolderStructure } from "../utils";

export default function FileExplorer({
  files,
  selectedFile,
  onSelectFile,
}: FileExplorerProps) {
  const folderStructure = createFolderStructure(files);
  // console.log(folderStructure);

  const renderFolderStructure = (
    structure: FolderStructure,
    path: string = "",
    depth: number = 0
  ) => {
    return Object.entries(structure).map(([key, value]) => {
      const currentPath = path ? `${path}/${key}` : key;

      if (Array.isArray(value)) {
        const file = value[0];
        const isSelected = selectedFile?.path === file.path;

        return (
          <div
            key={file.path}
            className={`flex items-center px-3 py-1.5 cursor-pointer transition-colors ${
              isSelected
                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300"
                : "hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300"
            }`}
            style={{ paddingLeft: `${depth * 12 + 12}px` }}
            onClick={() => onSelectFile(file)}
          >
            <File
              size={16}
              className={`mr-2 ${
                isSelected
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            />
            <span className="truncate">{key}</span>
          </div>
        );
      } else {
        return (
          <details key={currentPath} open>
            <summary
              className="flex items-center px-3 py-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-slate-700 dark:text-slate-300"
              style={{ paddingLeft: `${depth * 12 + 12}px` }}
            >
              <Folder
                size={16}
                className="mr-2 text-slate-500 dark:text-slate-400"
              />
              <span className="font-medium">{key}</span>
            </summary>
            {renderFolderStructure(
              value as FolderStructure,
              currentPath,
              depth + 1
            )}
          </details>
        );
      }
    });
  };

  return (
    <div className="text-sm">{renderFolderStructure(folderStructure)}</div>
  );
}
