import { WebContainer } from "@webcontainer/api";
import { useEffect, useRef, useState } from "react";

export const useWebContainer = () => {
  const [webcontainer, setWebcontainer] = useState<WebContainer>();
  const booted = useRef(false);

  async function main() {
    try {
      const webcontainerInstance = await WebContainer.boot();
      setWebcontainer(webcontainerInstance);
    } catch (error) {
      console.error("Failed to boot WebContainer:", error);
    }
  }

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    main();
  }, []);

  return webcontainer;
};
