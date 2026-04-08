import { useState, useRef } from 'react';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';
import { uid, todayStr, fmtDate } from '../utils/helpers';
import { useApp } from '../contexts/AppContext';

const VAULT_CATEGORIES = ['Blood Work', 'Imaging / MRI / X-Ray', 'Prescription', 'Doctor Notes', 'Insurance', 'Referral', 'Symptom Photo', 'Other'];
const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.heic,.HEIC,.webp';

function FileIcon({ name }) {
  const ext = name?.split('.').pop()?.toLowerCase();
  if (['jpg','jpeg','png','webp','heic'].includes(ext)) return <span style={{ fontSize: 22 }}>🖼️</span>;
  if (ext === 'pdf') return <span style={{ fontSize: 22 }}>📄</span>;
  return <span style={{ fontSize: 22 }}>📎</span>;
}

export default function MedicalVault({ data, upd }) {
  const { user } = useApp();
  const docs     = (data.documents || []).filter(d => !d._deleted);
  const [category, setCategory] = useState('');
  const [noteText, setNoteText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [drag, setDrag]           = useState(false);
  const [filter, setFilter]       = useState('all');
  const fileRef = useRef();

  const upload = async file => {
    if (!user) { alert('You must be signed in to upload files.'); return; }
    setUploading(true); setProgress(10);
    try {
      // Firebase Storage path: users/{uid}/vault/{uniqueFileName}
      const ext      = file.name.split('.').pop();
      const safeName = `${uid()}.${ext}`;
      const path     = `users/${user.uid}/vault/${safeName}`;
      const sRef     = storageRef(storage, path);

      setProgress(30);
      const snapshot = await uploadBytes(sRef, file);
      setProgress(70);
      const url = await getDownloadURL(snapshot.ref);
      setProgress(90);

      const doc = {
        id:         uid(),
        name:       file.name,
        category:   category || 'Other',
        notes:      noteText,
        url,
        storagePath: path,
        uploadDate: todayStr(),
        size:       Math.round(file.size / 1024) + 'KB',
        type:       file.type,
      };
      upd('documents', [doc, ...data.documents]);
      setProgress(100);
      setTimeout(() => setProgress(0), 1000);
    } catch (e) {
      console.error('Upload error:', e);
      alert(`Upload failed: ${e.message}. Check Firebase Storage rules.`);
    }
    setUploading(false);
    setNoteText('');
  };

  const softDel = id => {
    if (!window.confirm('Move to trash? (Recovered within 7 days)')) return;
    const item = docs.find(d => d.id === id);
    if (!item) return;
    upd('documents', data.documents.map(d =>
      d.id === id ? { ...d, _deleted: true, _deletedAt: new Date().toISOString() } : d
    ));
  };

  const hardDelete = async id => {
    const item = data.documents.find(d => d.id === id);
    if (!item) return;
    try {
      if (item.storagePath) {
        const sRef = storageRef(storage, item.storagePath);
        await deleteObject(sRef);
      }
    } catch (e) { console.warn('Storage delete error:', e); }
    upd('documents', data.documents.filter(d => d.id !== id));
  };

  const filtered = filter === 'all' ? docs : docs.filter(d => d.category === filter);
  const trashed  = (data.documents || []).filter(d => d._deleted);

  return (
    <div>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, fontWeight: 600, color: '#C9A84C', marginBottom: 4 }}>🔐 Medical Vault</div>
      <div style={{ fontSize: 13, color: 'rgba(240,232,255,.4)', marginBottom: 6 }}>Blood work, imaging, prescriptions — stored privately in your account</div>
      <div style={{ fontSize: 12, color: 'rgba(123,47,190,.6)', marginBottom: 22, padding: '9px 14px', background: 'rgba(123,47,190,.07)', borderRadius: 10, display: 'inline-block' }}>
        🔒 Files are stored in your private Firebase Storage path. Only you can access them.
      </div>

      {/* Upload zone */}
      <div className="glass-card-static" style={{ padding: 22, marginBottom: 22 }}>
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); [...e.dataTransfer.files].forEach(upload); }}
          onClick={() => fileRef.current?.click()}
          style={{ border: `2px dashed ${drag ? '#C9A84C' : 'rgba(123,47,190,.28)'}`, borderRadius: 14, padding: '28px 20px', textAlign: 'center', marginBottom: 16, transition: 'all .2s', background: drag ? 'rgba(201,168,76,.04)' : 'transparent', cursor: 'pointer' }}
        >
          <div style={{ fontSize: 28, marginBottom: 7, opacity: .5 }}>📁</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, color: '#C9A84C', marginBottom: 3 }}>Drag & drop your files here</div>
          <div style={{ fontSize: 12, color: 'rgba(240,232,255,.3)', marginBottom: 12 }}>PDF, JPG, PNG, HEIC accepted</div>
          <button className="btn btn-gold" style={{ fontSize: 12, pointerEvents: 'none' }}>Browse Files</button>
          <input ref={fileRef} type="file" multiple accept={ACCEPTED} style={{ display: 'none' }} onChange={e => [...e.target.files].forEach(upload)}/>
        </div>

        {uploading && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(240,232,255,.5)', marginBottom: 5 }}>
              <span>Uploading…</span><span>{progress}%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#7B2FBE,#C9A84C)', transition: 'width .3s ease', borderRadius: 3 }}/>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }} className="two-col">
          <div>
            <label>File category</label>
            <select className="field" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Select category…</option>
              {VAULT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label>Notes about this file</label>
            <input className="field" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="e.g. CBC panel — March 2025"/>
          </div>
        </div>
      </div>

      {/* Category filter */}
      {docs.length > 0 && (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 16 }}>
          <button onClick={() => setFilter('all')} style={{ padding: '4px 13px', borderRadius: 20, fontSize: 11, border: `1px solid ${filter==='all'?'#C9A84C':'rgba(123,47,190,.25)'}`, background: filter==='all'?'rgba(201,168,76,.1)':'rgba(255,255,255,.03)', color: filter==='all'?'#C9A84C':'rgba(240,232,255,.42)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>All</button>
          {[...new Set(docs.map(d => d.category))].map(c => (
            <button key={c} onClick={() => setFilter(c)} style={{ padding: '4px 13px', borderRadius: 20, fontSize: 11, border: `1px solid ${filter===c?'#C9A84C':'rgba(123,47,190,.25)'}`, background: filter===c?'rgba(201,168,76,.1)':'rgba(255,255,255,.03)', color: filter===c?'#C9A84C':'rgba(240,232,255,.42)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{c}</button>
          ))}
        </div>
      )}

      {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: 'rgba(240,232,255,.25)', fontStyle: 'italic' }}>No files in vault yet.</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {filtered.map(d => (
          <div key={d.id} className="glass-card" style={{ padding: 14, display: 'flex', gap: 13, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <FileIcon name={d.name}/>
            <div style={{ flex: 1, minWidth: 120 }}>
              <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, fontSize: 13, color: '#C084FC', textDecoration: 'none' }}>{d.name}</a>
              <div style={{ fontSize: 11, color: 'rgba(240,232,255,.3)', marginTop: 2 }}>{d.category || 'Document'} · {fmtDate(d.uploadDate)}{d.size ? ' · ' + d.size : ''}</div>
              {d.notes && <div style={{ fontSize: 12, color: 'rgba(240,232,255,.4)', marginTop: 3 }}>{d.notes}</div>}
            </div>
            <button className="btn btn-danger" style={{ fontSize: 10, padding: '4px 9px', flexShrink: 0 }} onClick={() => softDel(d.id)}>Remove</button>
          </div>
        ))}
      </div>

      {/* Trash recovery */}
      {trashed.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,80,80,.4)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>Trash (7-day recovery)</div>
          {trashed.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,80,80,.05)', borderRadius: 10, border: '1px solid rgba(255,80,80,.12)', marginBottom: 7, opacity: .65 }}>
              <FileIcon name={d.name}/>
              <div style={{ flex: 1, fontSize: 12, color: 'rgba(240,232,255,.5)' }}>{d.name} · Deleted {d._deletedAt ? new Date(d._deletedAt).toLocaleDateString() : '—'}</div>
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => upd('documents', data.documents.map(x => x.id === d.id ? { ...x, _deleted: false, _deletedAt: undefined } : x))}>Restore</button>
              <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => hardDelete(d.id)}>Delete Forever</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}