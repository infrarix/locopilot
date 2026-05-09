'use strict';

export interface NdjsonParser {
  feed(chunk: string): unknown[];
  flush(): unknown[];
}

export function createNdjsonParser(): NdjsonParser {
  let buffer = '';

  return {
    feed(chunk: string): unknown[] {
      buffer += chunk;
      const results: unknown[] = [];
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          results.push(JSON.parse(trimmed));
        } catch {
          // skip unparseable lines (SSE prefixes, comments, etc.)
        }
      }

      return results;
    },

    flush(): unknown[] {
      const trimmed = buffer.trim();
      buffer = '';
      if (!trimmed) return [];
      try {
        return [JSON.parse(trimmed)];
      } catch {
        return [];
      }
    },
  };
}
