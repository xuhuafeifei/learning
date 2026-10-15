// 切分策略
export interface ChunkingStrategy {
  chunk(text: string): string[];
}

// 500字符切分策略（无 overlap，步进 = 窗口）
export class FiftyCharacterChunkingStrategy implements ChunkingStrategy {
  chunk(text: string): string[] {
    const size = 500;
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += size) {
      chunks.push(text.slice(i, i + size));
    }
    return chunks;
  }
}

// overlap 500字符切分策略：窗口 500，重叠可配
export class OverlapCharacterChunkingStrategy implements ChunkingStrategy {
  private overlap: number;

  constructor(overlap: number = 100) {
    this.overlap = overlap;
  }

  chunk(text: string): string[] {
    const size = 500;
    const step = size - this.overlap;
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += step) {
      chunks.push(text.slice(i, i + size));
      if (i + size >= text.length) {
        break;
      }
    }
    return chunks;
  }
}

// 1000字符切分策略（无 overlap，步进 = 窗口）
export class ThousandCharacterChunkingStrategy implements ChunkingStrategy {
  chunk(text: string): string[] {
    const size = 1000;
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += size) {
      chunks.push(text.slice(i, i + size));
    }
    return chunks;
  }
}

// 按照标题切分策略
export class TitleChunkingStrategy implements ChunkingStrategy {
  chunk(text: string): string[] {
    let buffer: string = "";
    let ans: string[] = [];
    for (const line of text.split("\n")) {
      if (line.startsWith("#")) {
        if (buffer.length > 0) {
          ans.push(buffer);
          buffer = "";
        }
      } else {
        buffer += line + "\n";
      }
    }
    return ans;
  }
}

// 按段落切分策略
export class ParagraphChunkingStrategy implements ChunkingStrategy {
  chunk(text: string): string[] {
    return text.split("\n\n").map((paragraph) => paragraph.trim());
  }
}

// 文本切分器
export class Chunker {

  constructor() {
  }
  chunk(text: string, strategy: ChunkingStrategy): string[] {
    return strategy.chunk(text);
  }
}
