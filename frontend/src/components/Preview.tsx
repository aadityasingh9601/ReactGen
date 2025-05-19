import { WebContainer } from "@webcontainer/api";
import { useEffect, useState } from "react";

export default function Preview({ url }: { url: string }) {
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
