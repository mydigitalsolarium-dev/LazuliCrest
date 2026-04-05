import { useState } from 'react';
import { uid, todayStr, fmtDate } from '../utils/helpers';

const ILLNESS_TYPES = ['Cold / Flu','Respiratory infection','UTI','Sinus infection','GI infection','Skin infection','Ear infection','Other infection'];

export default function MetabolicLab({ data, upd }) {
  const labs = data.metabolicLogs || [];
  const [open, setOpen] = useState(false);
  const blank = {
    date: todayStr(), time: new Date().toTimeString().slice(0,5),
    bloodSugar:'', sugarContext:'fasting',
    insulinBasal:'', insulinBolus:'', carbs:'',
    bp_systolic:'', bp_diastolic:'', heartRate:'', spo2:'',
    weight:'', temp:'',
    illness:'', illnessNotes:'', illnessImpact:'',
    notes:'',
  };
  const [form, setForm] = useState(blank);

  const save = () => {
    const entry = { ...form, id: uid() };
    upd('metabolicLogs', [entry, ...labs]);
    setForm(blank); setOpen(false);
  };
  const del = id => { if (confirm('Delete this log entry?')) upd('metabolicLogs', labs.filter(l=>l.id!==id)); };

  const f = (k, label, placeholder, type='text', unit='') => (
    <div>
      <label>{label}</label>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <input className="field" type={type} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} placeholder={placeholder} style={{ flex:1 }}/>
        {unit && <span style={{ fontSize:12, color:'rgba(240,232,255,.4)', flexShrink:0 }}>{unit}</span>}
      </div>
    </div>
  );

  // Compute stats
  const sugars = labs.filter(l=>l.bloodSugar).map(l=>+l.bloodSugar);
  const avgSugar = sugars.length ? Math.round(sugars.reduce((a,b)=>a+b,0)/sugars.length) : null;
  const recentBP = labs.find(l=>l.bp_systolic);
  const recentSPO2 = labs.find(l=>l.spo2);
  const illnessLogs = labs.filter(l=>l.illness);

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:30, fontWeight:600, color:'#C9A84C', marginBottom:4 }}>🔬 Metabolic Lab</div>
          <div style={{ fontSize:13, color:'rgba(240,232,255,.4)' }}>Blood sugar, insulin, vitals, and illness tracking</div>
        </div>
        <button className="btn btn-gold" onClick={()=>{setForm(blank);setOpen(true)}}>+ Log Vitals</button>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }} className="stats-grid">
        {[
          { label:'Avg Blood Sugar', val: avgSugar ? `${avgSugar} mg/dL` : '—', color:'#fcd34d', icon:'🩸' },
          { label:'Latest BP', val: recentBP ? `${recentBP.bp_systolic}/${recentBP.bp_diastolic}` : '—', color:'#f87171', icon:'❤️' },
          { label:'Latest SpO2', val: recentSPO2 ? `${recentSPO2.spo2}%` : '—', color:'#93c5fd', icon:'🫁' },
          { label:'Illness Events', val: illnessLogs.length, color:'#C084FC', icon:'🦠' },
        ].map((s,i)=>(
          <div key={i} className="glass-card-static" style={{ padding:'16px 14px', textAlign:'center' }}>
            <div style={{ fontSize:18, marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:700, color:s.color, lineHeight:1, marginBottom:4 }}>{s.val}</div>
            <div style={{ fontSize:11, color:'rgba(240,232,255,.38)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Blood sugar trend mini-chart */}
      {sugars.length > 1 && (
        <div className="glass-card-static" style={{ padding:'16px 20px', marginBottom:20 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, color:'#C9A84C', marginBottom:10 }}>🩸 Blood Sugar Trend</div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:56 }}>
            {sugars.slice(-14).map((v,i)=>{
              const max=Math.max(...sugars.slice(-14)); const min=Math.min(...sugars.slice(-14));
              const h = max===min ? 50 : Math.round(((v-min)/(max-min))*44)+8;
              const color = v<70?'#f87171':v>180?'#ef4444':v>140?'#fcd34d':'#6ee7b7';
              return (
                <div key={i} title={`${v} mg/dL`} style={{ flex:1, height:`${h}px`, background:color, borderRadius:3, opacity:.8, minWidth:6, transition:'height .3s ease', cursor:'default' }}/>
              );
            })}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:5, fontSize:10, color:'rgba(240,232,255,.28)' }}>
            <span>Low (&lt;70)</span><span style={{ color:'#6ee7b7' }}>Normal (70–140)</span><span>High (&gt;180)</span>
          </div>
        </div>
      )}

      {/* Log form */}
      {open && (
        <div className="glass-card-static" style={{ padding:24, marginBottom:20 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:'#C9A84C', marginBottom:18 }}>New Vitals Log</div>

          {/* Date/time */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }} className="two-col">
            <div><label>Date</label><input className="field" type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></div>
            <div><label>Time</label><input className="field" type="time" value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))}/></div>
          </div>

          {/* Blood sugar */}
          <div style={{ marginBottom:18, padding:'16px 18px', background:'rgba(252,211,77,.04)', border:'1px solid rgba(252,211,77,.12)', borderRadius:14 }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, color:'#fcd34d', marginBottom:12 }}>🩸 Blood Sugar & Insulin</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }} className="two-col">
              {f('bloodSugar','Blood Sugar','e.g. 120','number','mg/dL')}
              <div>
                <label>Context</label>
                <select className="field" value={form.sugarContext} onChange={e=>setForm(p=>({...p,sugarContext:e.target.value}))}>
                  {['fasting','pre-meal','post-meal (1hr)','post-meal (2hr)','bedtime','random','after exercise'].map(x=><option key={x}>{x}</option>)}
                </select>
              </div>
              {f('insulinBasal','Basal Insulin','e.g. 20','number','units')}
              {f('insulinBolus','Bolus Insulin','e.g. 4','number','units')}
              {f('carbs','Carbs with meal','e.g. 45','number','g')}
            </div>
          </div>

          {/* Vitals */}
          <div style={{ marginBottom:18, padding:'16px 18px', background:'rgba(248,113,113,.04)', border:'1px solid rgba(248,113,113,.1)', borderRadius:14 }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, color:'#f87171', marginBottom:12 }}>❤️ Vitals</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }} className="two-col">
              {f('bp_systolic','Systolic (top)','e.g. 120','number','mmHg')}
              {f('bp_diastolic','Diastolic (bottom)','e.g. 80','number','mmHg')}
              {f('heartRate','Heart Rate','e.g. 72','number','bpm')}
              {f('spo2','Oxygen Saturation','e.g. 98','number','%')}
              {f('temp','Temperature','e.g. 98.6','number','°F')}
              {f('weight','Weight','e.g. 145','number','lbs')}
            </div>
          </div>

          {/* Illness */}
          <div style={{ marginBottom:18, padding:'16px 18px', background:'rgba(192,132,252,.04)', border:'1px solid rgba(192,132,252,.1)', borderRadius:14 }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, color:'#C084FC', marginBottom:12 }}>🦠 Sickness / Infection</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }} className="two-col">
              <div>
                <label>Illness type (if any)</label>
                <select className="field" value={form.illness} onChange={e=>setForm(p=>({...p,illness:e.target.value}))}>
                  <option value="">None / not sick</option>
                  {ILLNESS_TYPES.map(x=><option key={x}>{x}</option>)}
                </select>
              </div>
              {form.illness && (
                <div>
                  <label>Impact on symptoms</label>
                  <select className="field" value={form.illnessImpact} onChange={e=>setForm(p=>({...p,illnessImpact:e.target.value}))}>
                    <option value="">Select…</option>
                    {['Glucose spike','Autoimmune flare','Energy crash','Increased pain','No noticeable impact'].map(x=><option key={x}>{x}</option>)}
                  </select>
                </div>
              )}
            </div>
            {form.illness && (
              <div style={{ marginTop:10 }}><label>Notes about this illness</label><textarea className="field" rows={2} value={form.illnessNotes} onChange={e=>setForm(p=>({...p,illnessNotes:e.target.value}))} style={{ resize:'vertical' }}/></div>
            )}
          </div>

          <div style={{ marginBottom:16 }}><label>General notes</label><textarea className="field" rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Anything else to note…" style={{ resize:'vertical' }}/></div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button className="btn btn-ghost" onClick={()=>setOpen(false)}>Cancel</button>
            <button className="btn btn-gold" onClick={save}>Save Vitals</button>
          </div>
        </div>
      )}

      {/* Log history */}
      {labs.length === 0 && !open && (
        <div style={{ textAlign:'center', padding:'28px', color:'rgba(240,232,255,.25)', fontSize:13, fontStyle:'italic' }}>No vitals logged yet.</div>
      )}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {labs.slice(0,20).map(l=>(
          <div key={l.id} className="glass-card" style={{ padding:'14px 18px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:10 }}>
              <div>
                <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:14, color:'#C9A84C', fontWeight:600 }}>{fmtDate(l.date)}</span>
                {l.time && <span style={{ fontSize:11, color:'rgba(240,232,255,.35)', marginLeft:8 }}>{l.time}</span>}
              </div>
              <button className="btn btn-danger" style={{ fontSize:10, padding:'3px 8px' }} onClick={()=>del(l.id)}>Delete</button>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {l.bloodSugar && <Chip icon="🩸" label={`${l.bloodSugar} mg/dL`} sub={l.sugarContext} color={+l.bloodSugar<70?'#f87171':+l.bloodSugar>180?'#ef4444':'#6ee7b7'}/>}
              {l.insulinBasal && <Chip icon="💉" label={`${l.insulinBasal}u Basal`} color="#fcd34d"/>}
              {l.insulinBolus && <Chip icon="💉" label={`${l.insulinBolus}u Bolus`} color="#fcd34d"/>}
              {l.carbs && <Chip icon="🥖" label={`${l.carbs}g carbs`} color="#f97316"/>}
              {l.bp_systolic && <Chip icon="❤️" label={`${l.bp_systolic}/${l.bp_diastolic} mmHg`} color="#f87171"/>}
              {l.heartRate && <Chip icon="💓" label={`${l.heartRate} bpm`} color="#f87171"/>}
              {l.spo2 && <Chip icon="🫁" label={`${l.spo2}% SpO2`} color="#93c5fd"/>}
              {l.illness && <Chip icon="🦠" label={l.illness} sub={l.illnessImpact} color="#C084FC"/>}
            </div>
            {l.notes && <div style={{ marginTop:8, fontSize:12, color:'rgba(240,232,255,.4)', fontStyle:'italic' }}>{l.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Chip({ icon, label, sub, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5, background:`${color}14`, border:`1px solid ${color}33`, borderRadius:20, padding:'4px 10px' }}>
      <span style={{ fontSize:12 }}>{icon}</span>
      <div>
        <div style={{ fontSize:11, fontWeight:600, color, lineHeight:1.2 }}>{label}</div>
        {sub && <div style={{ fontSize:10, color:'rgba(240,232,255,.35)', lineHeight:1 }}>{sub}</div>}
      </div>
    </div>
  );
}