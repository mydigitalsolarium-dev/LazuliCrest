import { useState } from "react";
import { uid } from "../utils";

const COMMON_CONDITIONS = [
  'Fibromyalgia','POTS / Dysautonomia','EDS (Ehlers-Danlos Syndrome)','ME/CFS','Lupus (SLE)',
  'Rheumatoid Arthritis','Multiple Sclerosis','Crohn\'s Disease','Ulcerative Colitis','IBS',
  'Endometriosis','MCAS','Hashimoto\'s Thyroiditis','Hypothyroidism','Type 1 Diabetes',
  'Type 2 Diabetes','PCOS','Interstitial Cystitis','Chronic Migraine','Anxiety Disorder',
  'Depression','ADHD','Autism','PTSD','Chronic Pain Syndrome','Ankylosing Spondylitis',
  'Psoriatic Arthritis','Sjögren\'s Syndrome','Raynaud\'s Phenomenon','Hidradenitis Suppurativa',
];

const ACCOUNT_TYPES = [
  { v:'self',  l:'Managing my own health', desc:'I have a chronic illness' },
  { v:'caree', l:'Caring for someone else', desc:'I help manage their health' },
];

export default function ProfileSection({ data, upd, user }) {
  const profile = data.profile || {};
  const [name, setName]           = useState(profile.name || '');
  const [careeName, setCareeName] = useState(profile.careeName || '');
  const [accountType, setAccountType] = useState(profile.accountType || 'self');
  const [goal, setGoal]           = useState(profile.goal || '');
  const [conditions, setConditions] = useState(
    typeof profile.conditions === 'string'
      ? profile.conditions.split(',').map(c => c.trim()).filter(Boolean)
      : (Array.isArray(profile.conditions) ? profile.conditions : [])
  );
  const [customCond, setCustomCond] = useState('');
  const [saved, setSaved]         = useState(false);

  const addCondition = (c) => {
    const trimmed = c.trim();
    if (!trimmed || conditions.includes(trimmed)) return;
    setConditions(prev => [...prev, trimmed]);
    setCustomCond('');
  };
  const removeCondition = c => setConditions(prev => prev.filter(x => x !== c));

  const save = () => {
    upd('profile', {
      ...profile,
      name: name.trim(),
      careeName: careeName.trim(),
      accountType,
      goal: goal.trim(),
      conditions: conditions.join(', '),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:30, fontWeight:600, color:'#C9A84C', marginBottom:4 }}>◈ My Health Profile</div>
      <div style={{ fontSize:14, color:'rgba(240,232,255,.4)', marginBottom:26 }}>Update your profile, conditions, and preferences at any time</div>

      <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
        {/* Account type */}
        <div className="glass-card-static" style={{ padding:22 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, color:'#C9A84C', marginBottom:14 }}>Account Type</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }} className="two-col">
            {ACCOUNT_TYPES.map(o => (
              <button key={o.v} onClick={() => setAccountType(o.v)}
                style={{ padding:'12px 14px', borderRadius:13, border:`1.5px solid ${accountType===o.v?'#C9A84C':'rgba(123,47,190,.2)'}`, background:accountType===o.v?'rgba(201,168,76,.08)':'rgba(255,255,255,.03)', color:accountType===o.v?'#C9A84C':'rgba(240,232,255,.4)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", textAlign:'left', transition:'all .15s' }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:3 }}>{o.l}</div>
                <div style={{ fontSize:11, opacity:.7 }}>{o.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Personal info */}
        <div className="glass-card-static" style={{ padding:22 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, color:'#C9A84C', marginBottom:14 }}>Personal Info</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }} className="two-col">
            <div>
              <label>Your Name</label>
              <input className="field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sarah"/>
            </div>
            {accountType === 'caree' && (
              <div>
                <label>Name of person you care for</label>
                <input className="field" value={careeName} onChange={e => setCareeName(e.target.value)} placeholder="e.g. Mom, Dad, Jamie…"/>
              </div>
            )}
            <div style={{ gridColumn: accountType === 'caree' ? undefined : '1/-1' }}>
              <label>Wellness Goal</label>
              <input className="field" value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g. Be better understood by my doctors"/>
            </div>
          </div>
          <div style={{ marginTop:10, padding:'9px 13px', background:'rgba(123,47,190,.06)', borderRadius:10, fontSize:11, color:'rgba(240,232,255,.3)' }}>
            📧 Account email: <span style={{ color:'rgba(240,232,255,.55)' }}>{user?.email}</span>
            <span style={{ marginLeft:12, color:'rgba(240,232,255,.2)' }}>· To change your password, use "Forgot password" on the sign-in screen</span>
          </div>
        </div>

        {/* Conditions / Diagnoses */}
        <div className="glass-card-static" style={{ padding:22 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, color:'#C9A84C', marginBottom:6 }}>
            Diagnoses & Conditions
          </div>
          <div style={{ fontSize:12, color:'rgba(240,232,255,.35)', marginBottom:16, lineHeight:1.6 }}>
            Add, edit, or remove your diagnoses at any time. Your AI Advocate uses these to personalize responses.
          </div>

          {/* Current conditions */}
          {conditions.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
              {conditions.map(c => (
                <div key={c} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(123,47,190,.15)', border:'1px solid rgba(123,47,190,.3)', borderRadius:20, padding:'5px 12px' }}>
                  <span style={{ fontSize:12, color:'#C084FC', fontWeight:500 }}>{c}</span>
                  <button onClick={() => removeCondition(c)} style={{ border:'none', background:'transparent', color:'rgba(192,132,252,.5)', cursor:'pointer', fontSize:14, lineHeight:1, padding:'0 0 0 2px' }}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Quick-add common conditions */}
          <div style={{ marginBottom:14 }}>
            <label>Add a common condition</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:7, maxHeight:180, overflowY:'auto', paddingRight:4 }}>
              {COMMON_CONDITIONS.filter(c => !conditions.includes(c)).map(c => (
                <button key={c} onClick={() => addCondition(c)}
                  style={{ padding:'4px 11px', borderRadius:20, fontSize:11, border:'1px solid rgba(123,47,190,.22)', background:'rgba(255,255,255,.03)', color:'rgba(240,232,255,.45)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all .14s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='#C9A84C'; e.currentTarget.style.color='#C9A84C'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(123,47,190,.22)'; e.currentTarget.style.color='rgba(240,232,255,.45)'; }}>
                  + {c}
                </button>
              ))}
            </div>
          </div>

          {/* Custom condition */}
          <div>
            <label>Add a custom condition</label>
            <div style={{ display:'flex', gap:8, marginTop:6 }}>
              <input className="field" value={customCond} onChange={e => setCustomCond(e.target.value)}
                placeholder="Type a diagnosis not listed above…"
                onKeyDown={e => e.key === 'Enter' && addCondition(customCond)}/>
              <button className="btn btn-ghost" onClick={() => addCondition(customCond)} style={{ flexShrink:0, fontSize:13 }}>Add</button>
            </div>
          </div>
        </div>

        {/* Save */}
        {saved && (
          <div style={{ padding:'11px 16px', background:'rgba(110,231,183,.1)', border:'1px solid rgba(110,231,183,.22)', borderRadius:11, fontSize:13, color:'#6ee7b7' }}>
            ✓ Profile saved successfully!
          </div>
        )}
        <button className="btn btn-gold" onClick={save} style={{ justifyContent:'center', padding:'13px', fontSize:14, width:'100%' }}>
          Save Profile
        </button>

        {/* Care mode info */}
        {accountType === 'caree' && (
          <div style={{ padding:'14px 18px', background:'rgba(201,168,76,.06)', border:'1px solid rgba(201,168,76,.14)', borderRadius:13, fontSize:12, color:'rgba(201,168,76,.62)', lineHeight:1.7 }}>
            👁 <strong style={{ color:'#C9A84C' }}>Care mode:</strong> Users with access to this account can view all charts, logs, and health data — but cannot change this profile, password, or account settings. Share your account credentials only with trusted caregivers.
          </div>
        )}
      </div>
    </div>
  );
}
