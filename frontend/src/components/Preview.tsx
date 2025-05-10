import React from "react";
import { WebContainer } from "@webcontainer/api";
import { useEffect, useState } from "react";

interface MyProps {
  webContainer?: WebContainer;
}

export default function Preview({ webContainer }: MyProps) {
  const [url, setUrl] = useState("");

  async function main() {
    //Install the dependencies.
    const installProcess = await webContainer?.spawn("npm", ["install"]);

    // installProcess?.output.pipeTo(
    //   new WritableStream({
    //     write(data) {
    //       console.log(data);
    //     },
    //   })
    // );

    const installExitCode = await installProcess?.exit;

    if (installExitCode !== 0) {
      throw new Error("Unable to run npm install");
    }

    // `npm run dev`
    await webContainer?.spawn("npm", ["run", "dev"]);

    webContainer?.on("server-ready", (port, url) => {
      console.log(port);
      console.log(url);
      setUrl(url);
    });
  }

  useEffect(() => {
    main();
  }, []);

  return (
    <iframe title="Website Preview" src={url} height={"100%"} width={"100%"} />
  );
}
