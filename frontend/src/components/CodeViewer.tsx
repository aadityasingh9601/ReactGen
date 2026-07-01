import { useRef, useEffect } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { useTheme } from "../context/ThemeContext";
import { CodeViewerProps } from "../types";

export default function CodeViewer({ file, onContentChange }: CodeViewerProps) {
  const { theme } = useTheme();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const getLanguage = (filename: string): string => {
    const ext = filename.split(".").pop() || "";

    const languageMap: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      css: "css",
      html: "html",
      json: "json",
      md: "markdown",
      yml: "yaml",
      yaml: "yaml",
    };

    return languageMap[ext.toLowerCase()] || "plaintext";
  };

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const pos = editor.getScrollPosition();
    const scrollHeight = editor.getScrollHeight();
    const height = editor.getLayoutInfo().height;
    if (scrollHeight - pos.scrollTop - height < 30) {
      editor.revealLine(editor.getModel()?.getLineCount() ?? 1);
    }
  }, [file.content]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && onContentChange) {
      onContentChange(value);
    }
  };

  const filename = file.path.split("/").pop() || "";
  const language = getLanguage(filename);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-slate-800 dark:bg-slate-900 text-white flex items-center justify-between">
        <h3 className="font-mono text-sm">{file.path}</h3>
      </div>
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={language}
          value={file.content}
          path={file.path}
          theme={theme === "dark" ? "vs-dark" : "light"}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          options={{
            fontSize: 14,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
