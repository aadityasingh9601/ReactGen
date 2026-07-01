import { useEffect, useRef, useCallback } from "react";
import { WebContainer } from "@webcontainer/api";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { ChevronDown, ChevronUp, Terminal as TerminalIcon } from "lucide-react";

interface TerminalComponentProps {
  webContainer?: WebContainer;
  setPreviewUrl: (url: string) => void;
  height: number;
  onHeightChange: (newHeight: number) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function TerminalComponent({
  webContainer,
  setPreviewUrl,
  height,
  onHeightChange,
  collapsed,
  onToggleCollapse,
}: TerminalComponentProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (terminalInstance.current) return;

    const term = new Terminal({
      convertEol: true,
      fontSize: 14,
      cursorBlink: true,
      theme: { background: "black" },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    requestAnimationFrame(() => {
      if (terminalRef.current) {
        term.open(terminalRef.current);
        fitAddon.fit();
      }
    });

    terminalInstance.current = term;

    return () => {
      term.dispose();
      terminalInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (terminalInstance.current && terminalRef.current && fitAddonRef.current) {
      requestAnimationFrame(() => fitAddonRef.current?.fit());
    }
  }, [height, collapsed]);

  useEffect(() => {
    const main = async () => {
      if (!webContainer) return;

      const installProcess = await webContainer.spawn("npm", ["install"]);
      installProcess.output.pipeTo(
        new WritableStream({
          write(data) { terminalInstance.current?.write(data); },
        })
      );

      const installExitCode = await installProcess.exit;
      if (installExitCode !== 0) {
        throw new Error("Unable to run npm install");
      }

      const shell = await webContainer.spawn("jsh");
      shell.output.pipeTo(
        new WritableStream({
          write(data) { terminalInstance.current?.write(data); },
        })
      );

      const input = shell.input.getWriter();
      terminalInstance.current?.onData((data: string) => {
        input.write(data);
      });

      webContainer.on("server-ready", (_port, url) => {
        setPreviewUrl(url);
      });
    };
    main();
  }, [webContainer]);

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = height;

      const handleMouseMove = (e: MouseEvent) => {
        const delta = startY - e.clientY;
        const newHeight = Math.max(100, Math.min(600, startHeight + delta));
        onHeightChange(newHeight);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [height, onHeightChange]
  );

  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{ height: collapsed ? "36px" : `${height}px` }}
    >
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-slate-800 text-slate-300 text-xs cursor-pointer select-none border-t border-slate-700 flex-shrink-0"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-1.5">
          <TerminalIcon size={14} />
          <span className="font-medium">Terminal</span>
        </div>
        {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>

      {!collapsed && (
        <>
          <div
            className="h-[3px] cursor-n-resize hover:bg-blue-500 bg-transparent relative z-10 flex-shrink-0"
            onMouseDown={handleResizeMouseDown}
          />
          <div
            ref={terminalRef}
            className="bg-black flex-1 overflow-hidden"
          />
        </>
      )}
    </div>
  );
}
