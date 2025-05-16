import { WebContainer } from "@webcontainer/api";
import { useEffect, useState } from "react";

interface MyProps {
  webContainer?: WebContainer;
}

export default function Preview({ webContainer }: MyProps) {
  const [url, setUrl] = useState("");
  const [installOutput, setInstallOutput] = useState(""); // State to hold npm install output

  async function main() {
    //Install the dependencies.
    const installProcess = await webContainer?.spawn("npm", ["install"]);
    let currentOutput = "";
    installProcess?.output.pipeTo(
      new WritableStream({
        write(data) {
          currentOutput += data;
          setInstallOutput(currentOutput); // Update state with output
        },
      })
    );

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
    <div style={{ height: "100%", width: "100%" }}>
      {url === "" && (
        <div className="bg-white h-full">
          Preview is being generated based on the code
        </div>
      )}
      {url && (
        <iframe
          title="Website Preview"
          src={url}
          height={"100%"}
          width={"100%"}
        />
      )}
    </div>
  );
}
