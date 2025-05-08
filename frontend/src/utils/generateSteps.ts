interface Step {
  id: string;
  title: string;
  description: string;
  type: "file" | "dependency" | "command";
  icon: React.ReactNode;
  completed: boolean;
  expanded?: boolean;
  code?: string;
}

export function generateSteps(data: string): Step[] {
  if (typeof data !== "string") {
    console.warn("Expected a string but got:", typeof data);
    return [];
  }

  const steps: Step[] = [];
  const artifactMatch = data.match(/<boltArtifact[^>]*title="([^"]+)"[^>]*>/);
  const artifactTitle = artifactMatch ? artifactMatch[1] : "Project Files";

  const actionRegex =
    /<boltAction\s+type="(file|dependency|command)"\s+filePath="([^"]+)">([\s\S]*?)<\/boltAction>/g;

  let match;

  while ((match = actionRegex.exec(data)) !== null) {
    const [, type, filePath, content] = match;

    steps.push({
      id: crypto.randomUUID(), // 👈 Add unique ID
      title: filePath.trim(),
      description: artifactTitle,
      type: type as Step["type"],
      icon: null,
      completed: false,
      expanded: false,
      code: content.trim(),
    });
  }

  return steps;
}
