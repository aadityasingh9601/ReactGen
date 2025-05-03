export interface FileData {
  path: string;
  content: string;
  type: 'file' | 'directory';
}