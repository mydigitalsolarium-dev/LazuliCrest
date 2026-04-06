import { useState, useCallback } from 'react';

export function useShare() {
  const [shareStatus, setShareStatus] = useState('');

  const share = useCallback(async ({ title = 'ADVY Health', text = '', url = '' }) => {
    setShareStatus('sharing');
    if (navigator.share) {
      try {
        await navigator.share({ title, text, ...(url ? { url } : {}) });
        setShareStatus('shared');
        setTimeout(() => setShareStatus(''), 3000);
        return { success: true, method: 'native' };
      } catch (err) {
        if (err.name === 'AbortError') { setShareStatus(''); return { success: false, cancelled: true }; }
      }
    }
    try {
      await navigator.clipboard.writeText(url ? `${text}\n\n${url}` : text);
      setShareStatus('copied');
      setTimeout(() => setShareStatus(''), 3000);
      return { success: true, method: 'clipboard' };
    } catch {
      setShareStatus('error');
      setTimeout(() => setShareStatus(''), 4000);
      return { success: false };
    }
  }, []);

  return { share, shareStatus };
}

export const getShareLabel = (status, def = 'Share') =>
  ({ sharing: '⏳ Sharing…', shared: '✓ Shared!', copied: '✓ Copied!', error: '✗ Failed' }[status] || def);
export const getShareButtonLabel = (status, def = 'Share') => ({ sharing: '? Sharing�', shared: '? Shared!', copied: '? Copied!', error: '? Failed' }[status] || def);
