import { useState, useCallback } from 'react';

export function useShare() {
  const [shareStatus, setShareStatus] = useState('');
  const share = useCallback(async ({ title='Advy Health', text='', url='' }) => {
    setShareStatus('sharing');
    if (navigator.share) {
      try {
        await navigator.share({ title, text, ...(url ? {url} : {}) });
        setShareStatus('shared'); setTimeout(()=>setShareStatus(''), 3000);
        return { success:true, method:'native' };
      } catch(e) {
        if (e.name==='AbortError') { setShareStatus(''); return { success:false, cancelled:true }; }
      }
    }
    const full = url ? `${text}\n\n${url}` : text;
    try {
      await navigator.clipboard.writeText(full);
      setShareStatus('copied'); setTimeout(()=>setShareStatus(''), 3000);
      return { success:true, method:'clipboard' };
    } catch {
      setShareStatus('error'); setTimeout(()=>setShareStatus(''), 4000);
      return { success:false };
    }
  }, []);
  return { share, shareStatus };
}

export const getShareButtonLabel = (status, def='Share') => {
  if (status==='sharing') return '⏳ Sharing…';
  if (status==='shared')  return '✓ Shared!';
  if (status==='copied')  return '✓ Copied!';
  if (status==='error')   return '✗ Could not share';
  return def;
};
