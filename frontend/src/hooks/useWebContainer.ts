import { WebContainer } from "@webcontainer/api";
import { useEffect, useState } from "react";

export const useWebContainer = () => {
  const [webcontainer, setWebcontainer] = useState<WebContainer>();

  async function main() {
    // WARNING
    // Please note that the boot method can be called only once and only a single WebContainer instance
    // can be created.
    const webcontainerInstance = await WebContainer.boot();
    setWebcontainer(webcontainerInstance);
  }

  useEffect(() => {
    main();
  }, []);

  return webcontainer;
};
