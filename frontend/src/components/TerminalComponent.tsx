// src/components/Terminal.jsx
import React, { useEffect, useRef, useState } from "react";
import { WebContainer } from "@webcontainer/api";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { Rnd } from "react-rnd";

interface TerminalComponentProps {
  webContainer?: WebContainer;
  setPreviewUrl: any;
}

export default function TerminalComponent({
  webContainer,
  setPreviewUrl,
}: TerminalComponentProps) {
  const terminalRef = useRef(null);
  const terminal = useRef(null);
  const [installOutput, setInstallOutput] = useState(""); // State to hold npm install output

  useEffect(() => {
    const setupTerminal = async () => {
      // Initialize terminal
      terminal.current = new Terminal({
        convertEol: true,
        fontSize: 14,
        cursorBlink: true,

        theme: {
          background: "black",
        },
      });

      const fitAddon = new FitAddon();
      terminal.current.loadAddon(fitAddon);
      terminal.current.open(terminalRef.current);
      fitAddon.fit();
    };

    setupTerminal();
  }, []);

  // useEffect(() => {
  //   const main = async () => {
  //     if (!webContainer) return;
  //     //Install the dependencies.
  //     const installProcess = await webContainer?.spawn("npm", ["install"]);
  //     let currentOutput = "";
  //     installProcess?.output.pipeTo(
  //       new WritableStream({
  //         write(data) {
  //           terminal.current.write(data);
  //           currentOutput += data;
  //           setInstallOutput(currentOutput); // Update state with output
  //         },
  //       })
  //     );

  //     const installExitCode = await installProcess?.exit;

  //     if (installExitCode !== 0) {
  //       throw new Error("Unable to run npm install");
  //     }

  //     // `npm run dev`
  //     const shell = await webContainer?.spawn("jsh");

  //     // Pipe output to terminal
  //     shell.output.pipeTo(
  //       new WritableStream({
  //         write(data) {
  //           terminal.current.write(data);
  //         },
  //       })
  //     );

  //     // Pipe terminal input to shell
  //     const input = shell.input.getWriter();

  //     terminal.current.onData((data: string) => {
  //       input.write(data);
  //     });

  //     // On process exit
  //     shell.exit.then(() => {
  //       terminal.current.write("\r\n\x1b[31mShell exited\x1b[0m\r\n");
  //     });

  //     webContainer?.on("server-ready", (port, url) => {
  //       console.log(port);
  //       console.log(url);

  //       setPreviewUrl(url);
  //     });
  //   };

  //   main();
  // }, [webContainer]);

  async function interactiveTerminal() {
    const shell = webContainer?.spawn("jsh");
    //Every webContainer process has a output property.

    shell?.output.pipeTo(
      new WritableStream({
        write(data) {
          terminal.current.write(data);
        },
      })
    );

    // Pipe terminal input to shell
    const input = shell?.input.getWriter();

    terminal.current.onData((data: string) => {
      input.write(data);
    });
  }

  useEffect(() => {
    const main = async () => {
      const installProcess = await webContainer?.spawn("npm", ["install"]);

      const installExitCode = await installProcess?.exit;

      if (installExitCode !== 0) {
        throw new Error("Unable to run npm install");
      }

      let currentOutput = "";

      //Pipe(Print or send) the responses to terminal.
      installProcess?.output.pipeTo(
        new WritableStream({
          write(data) {
            terminal.current.write(data);
            currentOutput += data;
            setInstallOutput(currentOutput);
          },
        })
      );

      webContainer?.on("server-ready", (port, url) => {
        setPreviewUrl(url);
      });
    };

    //interactiveTerminal();

    main();
  }, [webContainer]);

  return (
    <Rnd
      default={{
        x: 643,
        y: 600,
        width: "100%",
        height: 200,
      }}
      minHeight={100}
      bounds="parent"
      enableResizing={{ top: true }}
      disableDragging={true}
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#1e1e1e",
        zIndex: 10,
        borderTop: "2px solid #333",
        boxShadow: "0 -2px 8px rgba(0, 0, 0, 0.3)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        ref={terminalRef}
        style={{
          flex: 1,
          width: "100%",
          overflow: "hidden",
          backgroundColor: "black",
          height: "fit-content",
        }}
      />
    </Rnd>
  );
}
