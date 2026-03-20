import { useState, useEffect } from "react";

// ── constants ──────────────────────────────────────────────────────────────
const PHASES = {
  menstrual:  { label:"Menstrual",  color:"#e05c7a", bg:"#fde8ee", emoji:"🌸", days:"1–5"  },
  follicular: { label:"Follicular", color:"#c97ab2", bg:"#f5e6f5", emoji:"🌱", days:"6–13" },
  ovulation:  { label:"Ovulation",  color:"#9b59b6", bg:"#ede0f7", emoji:"✨", days:"14–16"},
  luteal:     { label:"Luteal",     color:"#d4739c", bg:"#fde0ef", emoji:"🌙", days:"17–28"},
};
const SYMPTOMS = ["Cramps","Bloating","Headache","Fatigue","Breast tenderness","Nausea","Back pain","Spotting","Insomnia","Acne","Mood swings","Constipation"];
const MOODS    = ["😊 Happy","😔 Sad","😤 Irritable","😰 Anxious","😴 Exhausted","💪 Energetic","🥰 Romantic","😐 Neutral","😭 Emotional","🤩 Excited"];
const FLOW     = ["None","Spotting","Light","Medium","Heavy"];
const MONTHS   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const WDAYS    = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const EXERCISES = {
  menstrual:  ["🧘 Gentle yoga","🚶 Light walking","😴 Rest & recover","🌊 Swimming (light)"],
  follicular: ["🏃 Running","🚴 Cycling","🏋️ Strength training","💃 Dance classes"],
  ovulation:  ["⚡ HIIT workouts","🏊 Swimming laps","🎾 Tennis / sports","🧗 Rock climbing"],
  luteal:     ["🧘 Pilates","🚶 Brisk walking","🤸 Stretching","🏊 Easy swim"],
};
const FOODS = {
  menstrual:  ["🥬 Iron-rich spinach","🍫 Dark chocolate","🫚 Omega-3 salmon","🫖 Ginger tea"],
  follicular: ["🥚 Eggs & protein","🥦 Cruciferous veggies","🫐 Berries","🌰 Nuts & seeds"],
  ovulation:  ["🥗 Raw veggies","🍓 Antioxidant fruits","💧 Lots of water","🥑 Healthy fats"],
  luteal:     ["🍌 Magnesium bananas","🌾 Complex carbs","🫖 Chamomile tea","🎃 Pumpkin seeds"],
};
const PARTNER_GUIDE = {
  menstrual:  { emoji:"💊", do:"Bring comfort food, heating pad & cuddles.", dont:"Avoid stressful topics or criticism." },
  follicular: { emoji:"🎉", do:"Plan dates and adventures — she's energetic!", dont:"Don't cancel plans, she's excited." },
  ovulation:  { emoji:"🥰", do:"Perfect time for romance & deep conversations.", dont:"Don't be distant — she needs connection." },
  luteal:     { emoji:"🤗", do:"Be patient, validate her feelings, offer extra help.", dont:"Don't dismiss her emotions as 'just PMS'." },
};

function getPhase(day) {
  if (day <= 5)  return "menstrual";
  if (day <= 13) return "follicular";
  if (day <= 16) return "ovulation";
  return "luteal";
}
function addDays(date, n) { const d=new Date(date); d.setDate(d.getDate()+n); return d; }
function fmt(d) { return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); }
function fmtShort(d) { return d.toLocaleDateString("en-US",{month:"short",day:"numeric"}); }
function dateStr(d) { return d.toISOString().split("T")[0]; }

// ── pill button ────────────────────────────────────────────────────────────
function Pill({ active, color, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding:"6px 13px", borderRadius:20, fontFamily:"inherit", fontSize:12, fontWeight:600,
      border:`2px solid ${active ? color : "#e8c4d8"}`,
      background: active ? color : "white",
      color: active ? "white" : "#b07090",
      cursor:"pointer", transition:"all 0.18s",
    }}>{children}</button>
  );
}

// ── card ───────────────────────────────────────────────────────────────────
function Card({ children, style={} }) {
  return (
    <div style={{ background:"white", borderRadius:20, padding:18,
      boxShadow:"0 2px 16px rgba(200,120,180,0.11)", marginBottom:14, ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ children, color="#9b59b6" }) {
  return <div style={{ fontSize:14, fontWeight:700, color, marginBottom:12 }}>{children}</div>;
}

// ══════════════════════════════════════════════════════════════════════════
export default function Luna() {
  const [tab, setTab]           = useState("home");
  const [lastPeriod, setLastPeriod] = useState(() => { const d=new Date(); d.setDate(d.getDate()-8); return dateStr(d); });
  const [cycleLen, setCycleLen] = useState(28);
  const [periodLen, setPeriodLen] = useState(5);
  const [logs, setLogs]         = useState({});        // { "2026-03-10": { flow, mood, symptoms, notes, bbt, weight, water, stress, sleep } }
  const [pastCycles, setPastCycles] = useState([]);    // array of {start, length}
  const [partnerName, setPartnerName]     = useState("Partner");
  const [notifyDays, setNotifyDays]       = useState(3);
  const [pillReminder, setPillReminder]   = useState(false);
  const [pillTime, setPillTime]           = useState("08:00");
  const [mode, setMode]                   = useState("normal"); // normal | ttc | bc
  const [calMonth, setCalMonth] = useState(() => ({ y:new Date().getFullYear(), m:new Date().getMonth() }));
  const [selectedDay, setSelectedDay]     = useState(null);
  const [logForm, setLogForm]   = useState({ flow:"None", mood:"", symptoms:[], notes:"", bbt:"", weight:"", water:0, stress:3, sleep:7 });
  const [showNotif, setShowNotif]         = useState(false);
  const [insight, setInsight]             = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [lateAlert, setLateAlert]         = useState(false);

  const today = new Date();
  const lpDate = new Date(lastPeriod+"T00:00:00");
  const diffDays = Math.floor((today - lpDate)/(1000*60*60*24));
  const dayInCycle = ((diffDays % cycleLen)+cycleLen)%cycleLen+1;
  const daysLeft   = cycleLen - dayInCycle + 1;
  const currentPhase = getPhase(dayInCycle);
  const phase        = PHASES[currentPhase];
  const nextPeriod   = addDays(today, daysLeft);
  const ovulDay      = addDays(lpDate, 13);
  const fertStart    = addDays(lpDate, 10);
  const fertEnd      = addDays(lpDate, 16);
  const avgCycle     = pastCycles.length ? Math.round(pastCycles.reduce((a,c)=>a+c.length,0)/pastCycles.length) : cycleLen;

  // late alert
  useEffect(() => { if (dayInCycle > cycleLen+3) setLateAlert(true); }, [dayInCycle, cycleLen]);
  // partner notif
  useEffect(() => { if (daysLeft <= notifyDays) setShowNotif(true); }, [daysLeft, notifyDays]);

  function getDayInfo(ds) {
    const d    = new Date(ds+"T00:00:00");
    const diff = Math.floor((d-lpDate)/(1000*60*60*24));
    const cd   = ((diff%cycleLen)+cycleLen)%cycleLen+1;
    return {
      ph: getPhase(cd), cycleDay: cd,
      isPeriod: cd<=periodLen, isOvulation: cd>=13&&cd<=16, isFertile: cd>=10&&cd<=16,
    };
  }

  function buildCal(y,m) {
    const first = new Date(y,m,1).getDay();
    const total = new Date(y,m+1,0).getDate();
    const cells = [];
    for(let i=0;i<first;i++) cells.push(null);
    for(let d=1;d<=total;d++) cells.push(d);
    return cells;
  }
  const cells = buildCal(calMonth.y, calMonth.m);

  function openLog(ds) {
    setSelectedDay(ds);
    setLogForm(logs[ds] || { flow:"None", mood:"", symptoms:[], notes:"", bbt:"", weight:"", water:0, stress:3, sleep:7 });
  }
  function saveLog() {
    setLogs(p=>({...p,[selectedDay]:logForm}));
    setSelectedDay(null);
  }
  function toggleSym(s) {
    setLogForm(p=>({ ...p, symptoms: p.symptoms.includes(s)?p.symptoms.filter(x=>x!==s):[...p.symptoms,s] }));
  }

  async function fetchInsight() {
    setLoadingInsight(true); setInsight(null);
    const summary = Object.entries(logs).slice(-7).map(([d,l])=>
      `${d}: flow=${l.flow}, mood=${l.mood}, symptoms=${l.symptoms?.join(",")||"none"}, sleep=${l.sleep}h, stress=${l.stress}/5, water=${l.water} glasses`
    ).join("\n")||"No logs yet.";
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          messages:[{ role:"user", content:
            `You are a compassionate women's health assistant. Based on:\n- Phase: ${currentPhase} (Day ${dayInCycle}/${cycleLen})\n- Days to next period: ${daysLeft}\n- Mode: ${mode}\n- Recent logs:\n${summary}\n\nGive a warm, personalized 4-sentence insight: 1) what to physically/emotionally expect, 2) self-care tip, 3) nutrition/lifestyle rec, 4) one positive affirmation. Be supportive and empowering.`
          }]
        })
      });
      const data = await res.json();
      setInsight(data.content?.[0]?.text||"Could not load insight.");
    } catch { setInsight("Could not connect. Please try again."); }
    setLoadingInsight(false);
  }

  // ── shared input style ────────────────────────────────────────────────
  const inp = { width:"100%", padding:"9px 12px", borderRadius:12,
    border:"1.5px solid #e8c4d8", fontFamily:"inherit", fontSize:13,
    color:"#4a2040", boxSizing:"border-box", outline:"none" };

  // ══════════════════════════════════════════════════════════════════════
  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(150deg,#fff0f7 0%,#fde8f5 50%,#f0e0ff 100%)",
      fontFamily:"'Palatino Linotype','Book Antiqua',Palatino,serif",
      color:"#4a2040", maxWidth:440, margin:"0 auto", paddingBottom:90,
    }}>

      {/* ── alerts ── */}
      {showNotif && (
        <div style={{ position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",
          width:"100%",maxWidth:440,zIndex:200,
          background:"linear-gradient(90deg,#e05c7a,#c97ab2)",
          color:"white",padding:"13px 18px",
          display:"flex",justifyContent:"space-between",alignItems:"center",
          boxShadow:"0 4px 20px rgba(224,92,122,0.4)" }}>
          <div>
            <div style={{fontWeight:700,fontSize:14}}>💌 Heads up, {partnerName}!</div>
            <div style={{fontSize:12,opacity:0.9}}>Period expected in ~{daysLeft} days 🌸</div>
          </div>
          <button onClick={()=>setShowNotif(false)} style={{background:"none",border:"none",color:"white",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
      )}
      {lateAlert && (
        <div style={{ position:"fixed",top:showNotif?52:0,left:"50%",transform:"translateX(-50%)",
          width:"100%",maxWidth:440,zIndex:199,
          background:"linear-gradient(90deg,#9b59b6,#6c3483)",
          color:"white",padding:"13px 18px",
          display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <div style={{fontWeight:700,fontSize:14}}>⚠️ Period may be late</div>
            <div style={{fontSize:12,opacity:0.9}}>You're on Day {dayInCycle} — consider taking a test.</div>
          </div>
          <button onClick={()=>setLateAlert(false)} style={{background:"none",border:"none",color:"white",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
      )}

      {/* ── header ── */}
      <div style={{
        background:"linear-gradient(135deg,#e05c7a 0%,#c97ab2 55%,#9b59b6 100%)",
        padding:`${showNotif||lateAlert?60:40}px 22px 26px`,
        borderRadius:"0 0 32px 32px",
        boxShadow:"0 8px 32px rgba(155,89,182,0.25)",
      }}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.75)",letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>
          {fmt(today)}
        </div>
        <div style={{fontSize:26,fontWeight:700,color:"white",marginBottom:4}}>
          {phase.emoji} {phase.label} Phase
        </div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.85)",marginBottom:14}}>
          Day {dayInCycle} of {cycleLen} · {daysLeft} days to next period
        </div>
        {/* mode badges */}
        <div style={{display:"flex",gap:8}}>
          {[["normal","🌸 Normal"],["ttc","👶 TTC"],["bc","💊 Birth Control"]].map(([k,l])=>(
            <button key={k} onClick={()=>setMode(k)} style={{
              padding:"4px 12px",borderRadius:14,fontSize:11,fontWeight:700,fontFamily:"inherit",cursor:"pointer",
              background: mode===k?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.1)",
              color:"white", border: mode===k?"1.5px solid rgba(255,255,255,0.7)":"1.5px solid transparent",
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{padding:"18px 14px"}}>

        {/* ════════════ HOME ════════════ */}
        {tab==="home" && (
          <div>
            {/* cycle ring */}
            <div style={{display:"flex",justifyContent:"center",margin:"6px 0 18px"}}>
              <div style={{position:"relative",width:170,height:170}}>
                <svg width="170" height="170" style={{transform:"rotate(-90deg)"}}>
                  <circle cx="85" cy="85" r="68" fill="none" stroke="#f0d0e8" strokeWidth="13"/>
                  <circle cx="85" cy="85" r="68" fill="none"
                    stroke="url(#rg)" strokeWidth="13" strokeLinecap="round"
                    strokeDasharray={`${2*Math.PI*68}`}
                    strokeDashoffset={`${2*Math.PI*68*(1-dayInCycle/cycleLen)}`}/>
                  <defs>
                    <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#e05c7a"/>
                      <stop offset="100%" stopColor="#9b59b6"/>
                    </linearGradient>
                  </defs>
                </svg>
                <div style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontSize:34,fontWeight:800,color:"#9b59b6"}}>{dayInCycle}</div>
                  <div style={{fontSize:11,color:"#b07090",fontWeight:600}}>of {cycleLen} days</div>
                  <div style={{fontSize:10,color:phase.color,fontWeight:700,marginTop:2}}>{phase.emoji} {phase.label}</div>
                </div>
              </div>
            </div>

            {/* key dates grid */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              {[
                {l:"Next Period",   v:fmtShort(nextPeriod), e:"🌸", c:"#e05c7a"},
                {l:"Ovulation",     v:fmtShort(ovulDay),    e:"✨", c:"#9b59b6"},
                {l:"Fertile Start", v:fmtShort(fertStart),  e:"🌱", c:"#c97ab2"},
                {l:"Fertile End",   v:fmtShort(fertEnd),    e:"🍀", c:"#d4739c"},
                {l:"Avg Cycle",     v:`${avgCycle} days`,   e:"🔄", c:"#9b59b6"},
                {l:"Period Length", v:`${periodLen} days`,  e:"📅", c:"#e05c7a"},
              ].map(x=>(
                <div key={x.l} style={{background:"white",borderRadius:16,padding:"12px 14px",
                  boxShadow:"0 2px 10px rgba(200,120,180,0.1)",borderLeft:`4px solid ${x.c}`}}>
                  <div style={{fontSize:18,marginBottom:3}}>{x.e}</div>
                  <div style={{fontSize:10,color:"#b07090",textTransform:"uppercase",letterSpacing:1}}>{x.l}</div>
                  <div style={{fontSize:13,fontWeight:700,color:"#4a2040",marginTop:2}}>{x.v}</div>
                </div>
              ))}
            </div>

            {/* today's quick log summary */}
            {logs[dateStr(today)] && (
              <Card>
                <SectionTitle>📋 Today's Log</SectionTitle>
                {(() => { const l=logs[dateStr(today)]; return (
                  <div style={{fontSize:13,color:"#6a3060",lineHeight:1.8}}>
                    {l.flow!=="None"&&<div>🌊 Flow: <b>{l.flow}</b></div>}
                    {l.mood&&<div>Mood: <b>{l.mood}</b></div>}
                    {l.symptoms?.length>0&&<div>⚡ {l.symptoms.join(" · ")}</div>}
                    {l.bbt&&<div>🌡️ BBT: <b>{l.bbt}°C</b></div>}
                    {l.weight&&<div>⚖️ Weight: <b>{l.weight} kg</b></div>}
                    <div>💧 Water: <b>{l.water} glasses</b></div>
                    <div>😴 Sleep: <b>{l.sleep}h</b> · 😰 Stress: <b>{l.stress}/5</b></div>
                  </div>
                );})()}
              </Card>
            )}

            {/* phase tip */}
            <div style={{background:`linear-gradient(135deg,${phase.bg},white)`,borderRadius:18,padding:"15px 17px",marginBottom:14,border:`1.5px solid ${phase.color}25`}}>
              <div style={{fontSize:13,fontWeight:700,color:phase.color,marginBottom:5}}>💡 Phase Tip</div>
              <div style={{fontSize:13,lineHeight:1.6,color:"#6a3060"}}>
                {{
                  menstrual:"Rest and use heat pads for cramps. Iron-rich foods like spinach help replenish blood loss. Be gentle with yourself.",
                  follicular:"Your energy is rising! Great time to start new projects, socialize, and exercise more intensely.",
                  ovulation:"Peak fertility window. You may feel more confident, social, and attractive. Great time for important conversations.",
                  luteal:"Practice self-care. Magnesium-rich foods ease PMS. Prioritize sleep and reduce stress where possible.",
                }[currentPhase]}
              </div>
            </div>

            {/* exercise & food */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <Card style={{margin:0}}>
                <div style={{fontSize:13,fontWeight:700,color:"#e05c7a",marginBottom:8}}>🏃 Exercise</div>
                {EXERCISES[currentPhase].map(e=><div key={e} style={{fontSize:12,color:"#6a3060",marginBottom:4}}>{e}</div>)}
              </Card>
              <Card style={{margin:0}}>
                <div style={{fontSize:13,fontWeight:700,color:"#9b59b6",marginBottom:8}}>🥗 Foods</div>
                {FOODS[currentPhase].map(f=><div key={f} style={{fontSize:12,color:"#6a3060",marginBottom:4}}>{f}</div>)}
              </Card>
            </div>

            {/* pill reminder */}
            {mode==="bc" && (
              <Card>
                <SectionTitle color="#e05c7a">💊 Birth Control Reminder</SectionTitle>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                  <label style={{fontSize:13,color:"#6a3060"}}>Remind me daily at:</label>
                  <input type="time" value={pillTime} onChange={e=>setPillTime(e.target.value)} style={{...inp,width:"auto"}}/>
                </div>
                <div style={{background:"#fde8ee",borderRadius:12,padding:12,fontSize:13,color:"#e05c7a",fontWeight:600}}>
                  ⏰ Next reminder: Today at {pillTime}
                </div>
              </Card>
            )}

            {/* settings */}
            <Card>
              <SectionTitle>⚙️ My Cycle Settings</SectionTitle>
              <div style={{marginBottom:10}}>
                <label style={{fontSize:11,color:"#b07090",display:"block",marginBottom:3}}>Last Period Start</label>
                <input type="date" value={lastPeriod} onChange={e=>setLastPeriod(e.target.value)} style={inp}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <label style={{fontSize:11,color:"#b07090",display:"block",marginBottom:3}}>Cycle Length (days)</label>
                  <input type="number" value={cycleLen} min={21} max={40} onChange={e=>setCycleLen(+e.target.value)} style={inp}/>
                </div>
                <div>
                  <label style={{fontSize:11,color:"#b07090",display:"block",marginBottom:3}}>Period Length (days)</label>
                  <input type="number" value={periodLen} min={2} max={10} onChange={e=>setPeriodLen(+e.target.value)} style={inp}/>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ════════════ CALENDAR ════════════ */}
        {tab==="calendar" && (
          <div>
            <Card>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <button onClick={()=>setCalMonth(p=>{const d=new Date(p.y,p.m-1);return{y:d.getFullYear(),m:d.getMonth()};})}
                  style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#c97ab2"}}>‹</button>
                <div style={{fontWeight:700,color:"#9b59b6",fontSize:15}}>{MONTHS[calMonth.m]} {calMonth.y}</div>
                <button onClick={()=>setCalMonth(p=>{const d=new Date(p.y,p.m+1);return{y:d.getFullYear(),m:d.getMonth()};})}
                  style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#c97ab2"}}>›</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:5}}>
                {WDAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:10,color:"#b07090",fontWeight:600}}>{d}</div>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
                {cells.map((day,i)=>{
                  if(!day) return <div key={i}/>;
                  const ds=`${calMonth.y}-${String(calMonth.m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                  const info=getDayInfo(ds);
                  const isToday=day===today.getDate()&&calMonth.m===today.getMonth()&&calMonth.y===today.getFullYear();
                  const logged=logs[ds];
                  let bg="transparent";
                  if(info.isPeriod) bg="#fde8ee";
                  else if(info.isOvulation) bg="#ede0f7";
                  else if(info.isFertile) bg="#f5e6f5";
                  return (
                    <div key={i} onClick={()=>openLog(ds)} style={{
                      aspectRatio:"1",display:"flex",flexDirection:"column",
                      alignItems:"center",justifyContent:"center",
                      borderRadius:10,background:bg,cursor:"pointer",
                      border:isToday?"2px solid #e05c7a":"2px solid transparent",
                      position:"relative",
                    }}>
                      <span style={{fontSize:12,fontWeight:isToday?800:400,
                        color:info.isPeriod?"#e05c7a":info.isOvulation?"#9b59b6":"#4a2040"}}>{day}</span>
                      {logged&&<div style={{width:4,height:4,borderRadius:"50%",background:"#e05c7a",position:"absolute",bottom:3}}/>}
                    </div>
                  );
                })}
              </div>
              <div style={{display:"flex",gap:12,marginTop:12,flexWrap:"wrap"}}>
                {[["#fde8ee","Period"],["#ede0f7","Ovulation"],["#f5e6f5","Fertile"]].map(([c,l])=>(
                  <div key={l} style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{width:12,height:12,borderRadius:4,background:c}}/>
                    <span style={{fontSize:10,color:"#b07090"}}>{l}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* past cycles */}
            <Card>
              <SectionTitle>📊 Add Past Cycle</SectionTitle>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,alignItems:"end"}}>
                <div>
                  <label style={{fontSize:11,color:"#b07090",display:"block",marginBottom:3}}>Period Start</label>
                  <input type="date" id="ps" style={inp}/>
                </div>
                <div>
                  <label style={{fontSize:11,color:"#b07090",display:"block",marginBottom:3}}>Cycle Length</label>
                  <input type="number" id="pl" defaultValue={28} min={21} max={40} style={inp}/>
                </div>
                <button onClick={()=>{
                  const s=document.getElementById("ps").value;
                  const l=+document.getElementById("pl").value;
                  if(s&&l) setPastCycles(p=>[...p,{start:s,length:l}]);
                }} style={{padding:"9px 14px",borderRadius:12,background:"#e05c7a",color:"white",
                  border:"none",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer"}}>Add</button>
              </div>
              {pastCycles.length>0&&(
                <div style={{marginTop:12}}>
                  {pastCycles.map((c,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",
                      borderBottom:"1px solid #f0d0e8",fontSize:13,color:"#6a3060"}}>
                      <span>🌸 {c.start}</span><span>{c.length} days</span>
                      <button onClick={()=>setPastCycles(p=>p.filter((_,j)=>j!==i))}
                        style={{background:"none",border:"none",color:"#e05c7a",cursor:"pointer",fontSize:14}}>✕</button>
                    </div>
                  ))}
                  <div style={{marginTop:8,fontSize:13,fontWeight:700,color:"#9b59b6"}}>
                    📈 Average cycle: {avgCycle} days
                  </div>
                </div>
              )}
            </Card>

            {/* log modal */}
            {selectedDay&&(
              <div style={{position:"fixed",inset:0,background:"rgba(74,32,64,0.55)",zIndex:100,
                display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setSelectedDay(null)}>
                <div onClick={e=>e.stopPropagation()} style={{
                  background:"white",borderRadius:"24px 24px 0 0",
                  padding:"22px 18px 36px",width:"100%",maxWidth:440,
                  maxHeight:"85vh",overflowY:"auto",
                }}>
                  <div style={{fontWeight:700,fontSize:15,color:"#9b59b6",marginBottom:14}}>
                    📝 Log — {selectedDay}
                  </div>

                  {/* flow */}
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:12,color:"#b07090",marginBottom:6,fontWeight:600}}>🌊 Flow</div>
                    <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                      {FLOW.map(f=><Pill key={f} active={logForm.flow===f} color="#e05c7a" onClick={()=>setLogForm(p=>({...p,flow:f}))}>{f}</Pill>)}
                    </div>
                  </div>

                  {/* mood */}
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:12,color:"#b07090",marginBottom:6,fontWeight:600}}>😊 Mood</div>
                    <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                      {MOODS.map(m=><Pill key={m} active={logForm.mood===m} color="#c97ab2" onClick={()=>setLogForm(p=>({...p,mood:m}))}>{m}</Pill>)}
                    </div>
                  </div>

                  {/* symptoms */}
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:12,color:"#b07090",marginBottom:6,fontWeight:600}}>⚡ Symptoms</div>
                    <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                      {SYMPTOMS.map(s=><Pill key={s} active={logForm.symptoms?.includes(s)} color="#9b59b6" onClick={()=>toggleSym(s)}>{s}</Pill>)}
                    </div>
                  </div>

                  {/* health metrics */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                    <div>
                      <label style={{fontSize:12,color:"#b07090",display:"block",marginBottom:3}}>🌡️ BBT (°C)</label>
                      <input type="number" step="0.01" value={logForm.bbt} onChange={e=>setLogForm(p=>({...p,bbt:e.target.value}))} placeholder="36.5" style={inp}/>
                    </div>
                    <div>
                      <label style={{fontSize:12,color:"#b07090",display:"block",marginBottom:3}}>⚖️ Weight (kg)</label>
                      <input type="number" step="0.1" value={logForm.weight} onChange={e=>setLogForm(p=>({...p,weight:e.target.value}))} placeholder="55.0" style={inp}/>
                    </div>
                  </div>

                  {/* water */}
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:12,color:"#b07090",marginBottom:6,fontWeight:600}}>💧 Water Intake ({logForm.water} glasses)</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {[0,1,2,3,4,5,6,7,8].map(n=>(
                        <button key={n} onClick={()=>setLogForm(p=>({...p,water:n}))} style={{
                          width:34,height:34,borderRadius:"50%",border:"2px solid",fontFamily:"inherit",fontSize:13,cursor:"pointer",
                          borderColor:logForm.water>=n?"#9b59b6":"#e8c4d8",
                          background:logForm.water>=n?"#ede0f7":"white",
                          color:logForm.water>=n?"#9b59b6":"#b07090",fontWeight:600,
                        }}>{n}</button>
                      ))}
                    </div>
                  </div>

                  {/* sleep & stress */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                    <div>
                      <label style={{fontSize:12,color:"#b07090",display:"block",marginBottom:3}}>😴 Sleep ({logForm.sleep}h)</label>
                      <input type="range" min={3} max={12} value={logForm.sleep} onChange={e=>setLogForm(p=>({...p,sleep:+e.target.value}))} style={{width:"100%",accentColor:"#9b59b6"}}/>
                    </div>
                    <div>
                      <label style={{fontSize:12,color:"#b07090",display:"block",marginBottom:3}}>😰 Stress ({logForm.stress}/5)</label>
                      <input type="range" min={1} max={5} value={logForm.stress} onChange={e=>setLogForm(p=>({...p,stress:+e.target.value}))} style={{width:"100%",accentColor:"#e05c7a"}}/>
                    </div>
                  </div>

                  {/* notes */}
                  <div style={{marginBottom:16}}>
                    <label style={{fontSize:12,color:"#b07090",display:"block",marginBottom:3}}>📝 Notes</label>
                    <textarea value={logForm.notes} onChange={e=>setLogForm(p=>({...p,notes:e.target.value}))}
                      placeholder="How are you feeling today?" rows={3}
                      style={{...inp,resize:"none"}}/>
                  </div>

                  <button onClick={saveLog} style={{width:"100%",padding:14,borderRadius:16,
                    background:"linear-gradient(135deg,#e05c7a,#9b59b6)",
                    color:"white",border:"none",fontFamily:"inherit",fontSize:15,fontWeight:700,cursor:"pointer"}}>
                    Save Log ✓
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════ PARTNER ════════════ */}
        {tab==="partner" && (
          <div>
            <Card>
              <SectionTitle color="#e05c7a">💌 Partner Settings</SectionTitle>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:11,color:"#b07090",display:"block",marginBottom:3}}>Partner's Name</label>
                <input value={partnerName} onChange={e=>setPartnerName(e.target.value)} style={inp}/>
              </div>
              <div style={{marginBottom:6}}>
                <label style={{fontSize:11,color:"#b07090",display:"block",marginBottom:3}}>
                  Notify {notifyDays} day{notifyDays>1?"s":""} before period
                </label>
                <input type="range" min={1} max={7} value={notifyDays} onChange={e=>setNotifyDays(+e.target.value)} style={{width:"100%",accentColor:"#e05c7a"}}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#b07090"}}><span>1 day</span><span>7 days</span></div>
              </div>
            </Card>

            {/* message preview */}
            <Card>
              <SectionTitle color="#c97ab2">📬 Message for {partnerName}</SectionTitle>
              <div style={{background:"linear-gradient(135deg,#fde8ee,#f5e0ff)",borderRadius:14,padding:14,fontSize:13,lineHeight:1.75,color:"#6a3060",fontStyle:"italic",marginBottom:14}}>
                "Hey {partnerName}! Quick heads-up 💕 Her period is expected in about {daysLeft} days. She's currently in her <b style={{fontStyle:"normal"}}>{currentPhase}</b> phase. {PARTNER_GUIDE[currentPhase].do} 
                {mode==="ttc"?" (They're trying to conceive — this is an important window! 🍼)":""}"
              </div>
              <button onClick={()=>setShowNotif(true)} style={{width:"100%",padding:13,borderRadius:14,
                background:"linear-gradient(135deg,#e05c7a,#c97ab2)",
                color:"white",border:"none",fontFamily:"inherit",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                💌 Send Notification Now
              </button>
            </Card>

            {/* phase guide for partner */}
            <Card>
              <SectionTitle>🤝 {partnerName}'s Phase Guide</SectionTitle>
              {Object.entries(PHASES).map(([key,p])=>{
                const g=PARTNER_GUIDE[key];
                return (
                  <div key={key} style={{padding:"12px 14px",borderRadius:14,background:p.bg,marginBottom:9}}>
                    <div style={{fontSize:13,fontWeight:700,color:p.color,marginBottom:6}}>{p.emoji} {p.label} <span style={{fontWeight:400,fontSize:11}}>(Days {p.days})</span></div>
                    <div style={{fontSize:12,color:"#6a3060",marginBottom:3}}>✅ <b>Do:</b> {g.do}</div>
                    <div style={{fontSize:12,color:"#9b3060"}}>❌ <b>Avoid:</b> {g.dont}</div>
                  </div>
                );
              })}
            </Card>

            {/* TTC section */}
            {mode==="ttc" && (
              <Card>
                <SectionTitle color="#9b59b6">👶 Trying to Conceive</SectionTitle>
                <div style={{fontSize:13,lineHeight:1.75,color:"#6a3060"}}>
                  <div style={{background:"#ede0f7",borderRadius:12,padding:12,marginBottom:10}}>
                    <b>🌟 Best time to try:</b> {fmtShort(fertStart)} – {fmtShort(fertEnd)}
                  </div>
                  <div style={{background:"#fde8ee",borderRadius:12,padding:12,marginBottom:10}}>
                    <b>✨ Ovulation day:</b> {fmtShort(ovulDay)} — highest chance!
                  </div>
                  <div style={{fontSize:12,color:"#9b59b6",marginTop:8}}>
                    💡 Track BBT daily — a rise of 0.2°C+ after ovulation confirms it occurred.
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ════════════ INSIGHTS ════════════ */}
        {tab==="insights" && (
          <div>
            {/* AI */}
            <div style={{background:"linear-gradient(135deg,#9b59b6,#c97ab2)",borderRadius:20,padding:20,marginBottom:14,boxShadow:"0 4px 20px rgba(155,89,182,0.3)"}}>
              <div style={{fontSize:15,fontWeight:700,color:"white",marginBottom:8}}>✨ AI Health Insight</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.92)",lineHeight:1.75,minHeight:60}}>
                {loadingInsight ? "Getting your personalized insight…" : insight || "Tap below for a personalized health insight based on your phase and logs."}
              </div>
              <button onClick={fetchInsight} style={{marginTop:14,padding:"10px 20px",borderRadius:12,
                background:"rgba(255,255,255,0.2)",border:"1.5px solid rgba(255,255,255,0.5)",
                color:"white",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                {loadingInsight?"Loading…":"✨ Get My Insight"}
              </button>
            </div>

            {/* stats */}
            <Card>
              <SectionTitle>📈 This Cycle Stats</SectionTitle>
              {(() => {
                const dayLogs = Object.entries(logs).filter(([d])=>new Date(d+"T00:00:00")>=lpDate);
                const avgSleep = dayLogs.length ? (dayLogs.reduce((a,[,l])=>a+(l.sleep||0),0)/dayLogs.length).toFixed(1) : "—";
                const avgStress = dayLogs.length ? (dayLogs.reduce((a,[,l])=>a+(l.stress||0),0)/dayLogs.length).toFixed(1) : "—";
                const avgWater = dayLogs.length ? (dayLogs.reduce((a,[,l])=>a+(l.water||0),0)/dayLogs.length).toFixed(1) : "—";
                const topSym = (() => {
                  const cnt={}; dayLogs.forEach(([,l])=>l.symptoms?.forEach(s=>cnt[s]=(cnt[s]||0)+1));
                  return Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([s])=>s);
                })();
                return (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,textAlign:"center"}}>
                    {[["😴",avgSleep+"h","Avg Sleep"],["😰",avgStress+"/5","Avg Stress"],["💧",avgWater,"Avg Water"]].map(([e,v,l])=>(
                      <div key={l} style={{background:"#f5e0ff",borderRadius:14,padding:12}}>
                        <div style={{fontSize:20}}>{e}</div>
                        <div style={{fontSize:16,fontWeight:700,color:"#9b59b6"}}>{v}</div>
                        <div style={{fontSize:10,color:"#b07090"}}>{l}</div>
                      </div>
                    ))}
                    {topSym.length>0&&(
                      <div style={{gridColumn:"1/-1",background:"#fde8ee",borderRadius:14,padding:12,textAlign:"left"}}>
                        <div style={{fontSize:12,fontWeight:700,color:"#e05c7a",marginBottom:4}}>⚡ Top Symptoms This Cycle</div>
                        <div style={{fontSize:13,color:"#6a3060"}}>{topSym.join(" · ")}</div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </Card>

            {/* recent logs */}
            <Card>
              <SectionTitle>📋 Recent Logs</SectionTitle>
              {Object.keys(logs).length===0 ? (
                <div style={{fontSize:13,color:"#b07090",textAlign:"center",padding:"16px 0"}}>
                  No logs yet — tap any calendar day to start! 📅
                </div>
              ) : Object.entries(logs).slice(-6).reverse().map(([d,l])=>(
                <div key={d} style={{borderBottom:"1px solid #f0d0e8",paddingBottom:10,marginBottom:10}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#e05c7a"}}>{d}</div>
                  <div style={{fontSize:12,color:"#b07090",marginTop:3,lineHeight:1.7}}>
                    {l.flow!=="None"&&<span>🌊 {l.flow} · </span>}
                    {l.mood&&<span>{l.mood} · </span>}
                    {l.bbt&&<span>🌡️{l.bbt}°C · </span>}
                    {l.sleep&&<span>😴{l.sleep}h · </span>}
                    {l.water>0&&<span>💧{l.water} · </span>}
                    {l.symptoms?.length>0&&<span>⚡{l.symptoms.join(", ")}</span>}
                  </div>
                  {l.notes&&<div style={{fontSize:11,color:"#6a3060",fontStyle:"italic",marginTop:2}}>"{l.notes}"</div>}
                </div>
              ))}
            </Card>

            {/* health tips all phases */}
            <Card>
              <SectionTitle>🌿 All Phase Health Tips</SectionTitle>
              {Object.entries(PHASES).map(([key,p])=>(
                <div key={key} style={{padding:"12px 14px",borderRadius:14,background:p.bg,marginBottom:9}}>
                  <div style={{fontSize:13,fontWeight:700,color:p.color,marginBottom:4}}>{p.emoji} {p.label}</div>
                  <div style={{fontSize:12,color:"#6a3060",lineHeight:1.55}}>
                    {{
                      menstrual:"Rest, heat pads, iron-rich foods (spinach, lentils). Avoid caffeine.",
                      follicular:"Boost energy with high-protein meals. Start new habits & goals now.",
                      ovulation:"Stay hydrated, eat antioxidants. Great time for social & romance.",
                      luteal:"Magnesium foods reduce PMS. Prioritize sleep & reduce screen time.",
                    }[key]}
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}

      </div>

      {/* ── bottom nav ── */}
      <div style={{
        position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:440,
        background:"white",borderTop:"1px solid #f0d0e8",
        display:"flex",padding:"10px 0 16px",
        boxShadow:"0 -4px 20px rgba(200,120,180,0.12)",zIndex:50,
      }}>
        {[
          {id:"home",    icon:"🏠", label:"Home"},
          {id:"calendar",icon:"📅", label:"Calendar"},
          {id:"partner", icon:"💌", label:"Partner"},
          {id:"insights",icon:"✨", label:"Insights"},
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flex:1,background:"none",border:"none",cursor:"pointer",
            display:"flex",flexDirection:"column",alignItems:"center",gap:3,
            opacity:tab===t.id?1:0.45,
          }}>
            <span style={{fontSize:20}}>{t.icon}</span>
            <span style={{fontSize:9,color:tab===t.id?"#e05c7a":"#b07090",fontFamily:"inherit",fontWeight:tab===t.id?700:400}}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
