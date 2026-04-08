import { useState } from 'react';
import { uid, todayStr, fmtDate } from '../utils/helpers';

const PREP_ITEMS = [
  { id:'hydrate',   label:'Start hydrating today — aim for extra water',    icon:'💧' },
  { id:'snack',     label:'Pack a gentle snack (crackers, fruit, granola)',  icon:'🍎' },
  { id:'clothes',   label:'Lay out comfortable, loose-fitting clothes',      icon:'👕' },
  { id:'movie',     label:'Download a movie or playlist to your phone',      icon:'🎬' },
  { id:'blanket',   label:'Pack a cozy blanket or pillow',                   icon:'🛋️' },
  { id:'contacts',  label:'Let someone know your appointment time',          icon:'📱' },
  { id:'meds',      label:'Confirm any pre-medications with your team',      icon:'💊' },
  { id:'paperwork', label:'Bring your insurance card and medication list',   icon:'📋' },
];

const SIDE_EFFECTS = [
  'Nausea','Fatigue','Headache','Chills','Flushing','Shortness of breath',
  'Dizziness','Infusion site pain','Fever','Swelling','Itching','Chest tightness',
];

export default function InfusionHub({ data, upd }) {
  const infusions = (data.appointments||[]).filter(a => a.isInfusion);
  const allAppts   = data.appointments || [];

  const [showAdd, setShowAdd]         = useState(false);
  const [showCheckin, setShowCheckin] = useState(null);
  const [checkinForm, setCheckinForm] = useState({ mood:5, sideEffects:[], notes:'', timing:'during' });

  const blank = { id:'', date:'', provider:'', drugName:'', type:'Infusion', isInfusion:true, preNotes:'', postNotes:'', followUp:'', prepChecked:[], checkins:[] };
  const [form, setForm] = useState(blank);

  const [proactiveShown, setProactiveShown] = useState(false);
  const upcoming48 = infusions.find(a => {
    const d = new Date(a.date + 'T09:00:00');
    const diff = (d - new Date()) / (1000*60*60);
    return diff > 0 && diff <= 48;
  });

  const save = () => {
    if (!form.date || !form.provider) { alert('Date and provider required.'); return; }
    const entry = { ...form, id: form.id || uid() };
    const idx = allAppts.findIndex(a => a.id === entry.id);
    upd('appointments', idx>=0 ? allAppts.map((a,i)=>i===idx?entry:a) : [entry,...allAppts]);
    setForm(blank); setShowAdd(false);
  };

 const del = id => { if (window.confirm('Delete this infusion appointment?')) upd('appointments', allAppts.filter(a=>a.id!==id)); };

  const togglePrep = (apptId, itemId) => {
    upd('appointments', allAppts.map(a => {
      if (a.id !== apptId) return a;
      const checked = a.prepChecked || [];
      return { ...a, prepChecked: checked.includes(itemId) ? checked.filter(x=>x!==itemId) : [...checked, itemId] };
    }));
  };

  const saveCheckin = (apptId) => {
    upd('appointments', allAppts.map(a => {
      if (a.id !== apptId) return a;
      const ci = { ...checkinForm, id: uid(), timestamp: new Date().toISOString() };
      return { ...a, checkins: [...(a.checkins||[]), ci] };
    }));
    setShowCheckin(null);
    setCheckinForm({ mood:5, sideEffects:[], notes:'', timing:'during' });
  };

  const upcoming = infusions.filter(a => a.date >= todayStr()).sort((a,b)=>a.date.localeCompare(b.date));
  const past     = infusions.filter(a => a.date < todayStr()).sort((a,b)=>b.date.localeCompare(a.date));

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:30, fontWeight:600, color:'#C9A84C', marginBottom:4 }}>💉 Infusion Hub</div>
          <div style={{ fontSize:13, color:'rgba(240,232,255,.4)' }}>Schedule, prepare, and check in for your infusion appointments</div>
        </div>
        <button className="btn btn-gold" onClick={()=>{setForm(blank);setShowAdd(true)}}>+ Add Infusion</button>
      </div>

      {upcoming48 && !proactiveShown && (
        <div style={{ marginBottom:20, padding:'18px 22px', background:'linear-gradient(135deg,rgba(123,47,190,.12),rgba(201,168,76,.06))', border:'1px solid rgba(201,168,76,.25)', borderRadius:16, position:'relative' }}>
          <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
            <div style={{ fontSize:28, flexShrink:0, animation:'heartbeat 2s ease-in-out infinite' }}>💜</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:'#C9A84C', marginBottom:8 }}>Your Infusion Companion</div>
              <p style={{ fontSize:14, color:'rgba(240,232,255,.75)', lineHeight:1.75, marginBottom:12 }}>
                I know your <strong style={{color:'#C9A84C'}}>{upcoming48.provider}</strong> infusion is coming up on <strong style={{color:'#C9A84C'}}>{fmtDate(upcoming48.date)}</strong>. It's okay to feel a little tired or anxious right now — that's completely valid, and you're not alone in feeling that way. I'm right here with you. 💜
              </p>
              <p style={{ fontSize:13, color:'rgba(192,132,252,.7)', fontStyle:'italic', marginBottom:16 }}>
                Should we go over your gentle prep checklist together?
              </p>
              <div style={{ display:'flex', gap:9 }}>
                <button className="btn btn-gold" style={{ fontSize:13 }} onClick={()=>setProactiveShown(true)}>Yes, let's prep</button>
                <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={()=>setProactiveShown(true)}>I'm okay, thanks</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="glass-card-static" style={{ padding:24, marginBottom:20 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:'#C9A84C', marginBottom:16 }}>New Infusion Appointment</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }} className="two-col">
            <div><label>Date</label><input className="field" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
            <div><label>Infusion Center / Provider</label><input className="field" value={form.provider} onChange={e=>setForm(f=>({...f,provider:e.target.value}))} placeholder="e.g. MGH Infusion Center"/></div>
            <div><label>Drug / Treatment</label><input className="field" value={form.drugName||''} onChange={e=>setForm(f=>({...f,drugName:e.target.value}))} placeholder="e.g. Rituximab, IVIG, Remicade"/></div>
          </div>
          <div style={{ marginBottom:12 }}><label>Pre-appointment notes</label><textarea className="field" rows={2} value={form.preNotes} onChange={e=>setForm(f=>({...f,preNotes:e.target.value}))} style={{resize:'vertical'}}/></div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button className="btn btn-ghost" onClick={()=>setShowAdd(false)}>Cancel</button>
            <button className="btn btn-gold" onClick={save}>Save</button>
          </div>
        </div>
      )}

      {infusions.length === 0 && !showAdd && (
        <div style={{ textAlign:'center', padding:'36px 20px', color:'rgba(240,232,255,.28)', fontSize:13, fontStyle:'italic' }}>
          No infusion appointments yet.<br/>Add one above to unlock the prep checklist and companion features.
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'rgba(201,168,76,.45)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12 }}>Upcoming</div>
          {upcoming.map(a => (
            <InfusionCard key={a.id} appt={a} onDel={del} onTogglePrep={togglePrep} onCheckin={()=>{setShowCheckin(a.id); setCheckinForm({mood:5,sideEffects:[],notes:'',timing:'during'});}}/>
          ))}
        </div>
      )}

      {showCheckin && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', backdropFilter:'blur(8px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div className="glass-card-static" style={{ padding:28, maxWidth:480, width:'100%', borderRadius:20 }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:'#C9A84C', marginBottom:16 }}>💉 Infusion Check-In</div>
            <div style={{ marginBottom:14 }}>
              <label>Timing</label>
              <div style={{ display:'flex', gap:8, marginTop:6 }}>
                {['during','after'].map(t=>(
                  <button key={t} onClick={()=>setCheckinForm(f=>({...f,timing:t}))} style={{ padding:'6px 16px', borderRadius:20, fontSize:12, border:`1px solid ${checkinForm.timing===t?'#C9A84C':'rgba(123,47,190,.25)'}`, background:checkinForm.timing===t?'rgba(201,168,76,.1)':'rgba(255,255,255,.03)', color:checkinForm.timing===t?'#C9A84C':'rgba(240,232,255,.45)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", textTransform:'capitalize' }}>
                    {t === 'during' ? '⏱ During infusion' : '✅ After infusion'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <label style={{ margin:0 }}>Mood / How are you feeling?</label>
                <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontWeight:700, color:'#93c5fd' }}>{checkinForm.mood}/10</span>
              </div>
              <input type="range" min={1} max={10} value={checkinForm.mood} onChange={e=>setCheckinForm(f=>({...f,mood:+e.target.value}))} style={{ width:'100%', accentColor:'#C9A84C', marginBottom:4 }}/>
            </div>
            <div style={{ marginBottom:14 }}>
              <label>Side effects (select any)</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6 }}>
                {SIDE_EFFECTS.map(s=>(
                  <button key={s} onClick={()=>setCheckinForm(f=>({...f,sideEffects:f.sideEffects.includes(s)?f.sideEffects.filter(x=>x!==s):[...f.sideEffects,s]}))}>
                    <span style={{ padding:'4px 10px', borderRadius:20, fontSize:11, border:`1px solid ${checkinForm.sideEffects.includes(s)?'#f87171':'rgba(123,47,190,.25)'}`, background:checkinForm.sideEffects.includes(s)?'rgba(248,113,113,.12)':'rgba(255,255,255,.03)', color:checkinForm.sideEffects.includes(s)?'#f87171':'rgba(240,232,255,.4)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", display:'inline-block' }}>{s}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:18 }}>
              <label>Notes</label>
              <textarea className="field" rows={3} value={checkinForm.notes} onChange={e=>setCheckinForm(f=>({...f,notes:e.target.value}))} placeholder="How are you feeling? Any concerns?" style={{ resize:'vertical', marginTop:6 }}/>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={()=>setShowCheckin(null)}>Cancel</button>
              <button className="btn btn-gold" onClick={()=>saveCheckin(showCheckin)}>Save Check-In</button>
            </div>
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:'rgba(123,47,190,.4)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12 }}>Past</div>
          {past.slice(0,5).map(a => (
            <InfusionCard key={a.id} appt={a} onDel={del} onTogglePrep={togglePrep} past/>
          ))}
        </div>
      )}
    </div>
  );
}

function InfusionCard({ appt, onDel, onTogglePrep, onCheckin, past }) {
  const [open, setOpen] = useState(false);
  const checked = appt.prepChecked || [];
  const pct = Math.round((checked.length / PREP_ITEMS.length) * 100);
  const today = new Date();
  const apptDate = new Date(appt.date + 'T09:00:00');
  const diffH = (apptDate - today) / (1000*60*60);
  const within48 = diffH > 0 && diffH <= 48;

  return (
    <div className="glass-card-static" style={{ marginBottom:12, overflow:'hidden' }}>
      <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap', cursor:'pointer' }} onClick={()=>setOpen(o=>!o)}>
        <div style={{ background:'rgba(123,47,190,.12)', borderRadius:12, padding:'7px 10px', textAlign:'center', minWidth:46, flexShrink:0, border:'1px solid rgba(123,47,190,.22)' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#7B2FBE' }}>{new Date(appt.date+'T12:00:00').toLocaleDateString('en-US',{month:'short'})}</div>
          <div style={{ fontSize:18, fontWeight:700, color:'#C084FC', fontFamily:"'Cormorant Garamond',serif", lineHeight:1 }}>{new Date(appt.date+'T12:00:00').getDate()}</div>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:600, fontSize:14, color:'#F0E8FF' }}>{appt.provider}</div>
          <div style={{ fontSize:12, color:'rgba(240,232,255,.38)' }}>{appt.drugName||'Infusion'}{within48&&<span style={{ marginLeft:8, background:'rgba(201,168,76,.15)', color:'#C9A84C', padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700 }}>Coming up!</span>}</div>
        </div>
        {!past && <div style={{ fontSize:11, color:'rgba(201,168,76,.6)', fontWeight:600 }}>{pct}% prepped</div>}
        {!past && onCheckin && (
          <button className="btn btn-ghost" style={{ fontSize:11, padding:'5px 12px' }} onClick={e=>{e.stopPropagation();onCheckin();}}>Check in</button>
        )}
        <button className="btn btn-danger" style={{ fontSize:11, padding:'4px 9px' }} onClick={e=>{e.stopPropagation();onDel(appt.id);}}>Delete</button>
        <span style={{ fontSize:16, color:'rgba(240,232,255,.2)', transform:open?'rotate(90deg)':'none', transition:'transform .2s' }}>›</span>
      </div>

      {open && (
        <div style={{ padding:'0 20px 20px', borderTop:'1px solid rgba(123,47,190,.1)' }}>
          {!past && (
            <div style={{ marginTop:16 }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:'#C9A84C', marginBottom:12 }}>🌿 Gentle Prep Checklist</div>
              <div style={{ background:'rgba(255,255,255,.04)', borderRadius:8, height:4, overflow:'hidden', marginBottom:12 }}>
                <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#7B2FBE,#C9A84C)', borderRadius:8, transition:'width .4s ease' }}/>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {PREP_ITEMS.map(item => {
                  const done = checked.includes(item.id);
                  return (
                    <div key={item.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 12px', background:'rgba(255,255,255,.03)', borderRadius:10, cursor:'pointer', border:`1px solid ${done?'rgba(110,231,183,.2)':'rgba(123,47,190,.1)'}`, transition:'all .18s' }} onClick={()=>onTogglePrep(appt.id,item.id)}>
                      <div style={{ width:24, height:24, borderRadius:'50%', border:`2px solid ${done?'#6ee7b7':'rgba(123,47,190,.4)'}`, background:done?'linear-gradient(135deg,#6ee7b7,#34d399)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'#000', fontWeight:900, flexShrink:0 }}>{done?'✓':''}</div>
                      <span style={{ fontSize:12 }}>{item.icon}</span>
                      <span style={{ fontSize:13, color:done?'rgba(240,232,255,.4)':'#F0E8FF', textDecoration:done?'line-through':'none', flex:1 }}>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(appt.checkins||[]).length > 0 && (
            <div style={{ marginTop:16 }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, color:'#C9A84C', marginBottom:10 }}>Check-In Log</div>
              {appt.checkins.map(ci=>(
                <div key={ci.id} style={{ padding:'10px 13px', background:'rgba(255,255,255,.03)', borderRadius:10, marginBottom:8, fontSize:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ color:'rgba(201,168,76,.7)', fontWeight:600, textTransform:'capitalize' }}>{ci.timing}</span>
                    <span style={{ color:'rgba(240,232,255,.3)' }}>Mood {ci.mood}/10</span>
                  </div>
                  {ci.sideEffects?.length > 0 && <div style={{ color:'#f87171', marginBottom:4 }}>{ci.sideEffects.join(', ')}</div>}
                  {ci.notes && <div style={{ color:'rgba(240,232,255,.5)', fontStyle:'italic' }}>{ci.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
