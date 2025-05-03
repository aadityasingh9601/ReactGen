import React from 'react';
import { FileData } from '../types';
import Editor from '@monaco-editor/react';
import { useTheme } from '../context/ThemeContext';

interface CodeViewerProps {
  file: FileData;
  onContentChange?: (content: string) => void;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ file, onContentChange }) => {
  const { theme } = useTheme();
  
  const getLanguage = (filename: string): string => {
    const ext = filename.split('.').pop() || '';
    
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'css': 'css',
      'html': 'html',
      'json': 'json',
      'md': 'markdown',
      'yml': 'yaml',
      'yaml': 'yaml',
    };
    
    return languageMap[ext.toLowerCase()] || 'plaintext';
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && onContentChange) {
      onContentChange(value);
    }
  };
  
  const filename = file.path.split('/').pop() || '';
  const language = getLanguage(filename);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-slate-800 dark:bg-slate-900 text-white flex items-center justify-between">
        <h3 className="font-mono text-sm">{file.path}</h3>
      </div>
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage={language}
          value={file.content}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          onChange={handleEditorChange}
          options={{
            fontSize: 14,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
};

export default CodeViewer