// StreamParser class - handles all the extraction logic
export default class StreamParser {
  private buffer: string = "";
  private startTagPattern = /<boltAction/i;
  private endTagPattern = /<\/boltAction>/i;
  private tags: string[] = [];
  private inTag: boolean = false;
  private currentTag: string = "";

  // Process new data chunk
  processChunk(chunk: string): string[] {
    // Add new chunk to buffer
    this.buffer += chunk;

    // Debug
    //console.log(`Buffer size: ${this.buffer.length}, inTag: ${this.inTag}`);

    // Extract tags until we can't find any more complete ones
    this.extractTags();

    // Return any tags found and clear the array
    const extractedTags = [...this.tags];
    this.tags = [];
    return extractedTags;
  }

  private extractTags() {
    let startIdx: number;
    let endIdx: number;

    // Keep processing until we can't extract more complete tags
    while (true) {
      if (!this.inTag) {
        // Look for start tag
        startIdx = this.buffer.search(this.startTagPattern);
        if (startIdx === -1) {
          // No start tag found, keep only last 15 chars in case there's a partial tag
          if (this.buffer.length > 15) {
            this.buffer = this.buffer.slice(-15);
          }
          break;
        }

        // Found a start tag
        this.inTag = true;
        this.currentTag = this.buffer.slice(startIdx);
        this.buffer = this.buffer.slice(startIdx + 10); // Remove content before tag
      } else {
        // Already in a tag, looking for end tag
        endIdx = this.buffer.search(this.endTagPattern);
        if (endIdx === -1) {
          // No complete tag yet
          this.currentTag += this.buffer;
          this.buffer = "";
          break;
        }

        // Found end tag - create complete tag
        const completeTagPart = this.buffer.slice(0, endIdx + 13); // 13 = "</boltAction>".length
        const completeTag = this.currentTag + completeTagPart;

        // Store the complete tag
        this.tags.push(completeTag);

        // Reset for next tag
        this.inTag = false;
        this.currentTag = "";
        this.buffer = this.buffer.slice(endIdx + 13);
      }
    }
  }

  // For debugging
  getState() {
    return {
      bufferSize: this.buffer.length,
      bufferPreview:
        this.buffer.length > 0 ? this.buffer.slice(0, 20) + "..." : "",
      inTag: this.inTag,
      currentTagSize: this.currentTag.length,
      tagsFound: this.tags.length,
    };
  }
}

// In your component:
