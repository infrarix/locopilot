import { useCallback, useState } from 'react';

export function useCopyToClipboard(timeoutMs = 1500) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      try {
        if (typeof navigator === 'undefined' || !navigator.clipboard) return;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), timeoutMs);
      } catch {
        /* ignore — older browsers */
      }
    },
    [timeoutMs],
  );

  return { copied, copy };
}
