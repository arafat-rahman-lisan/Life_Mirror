class CanvasCharts {
  static setup(canvas) {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const cssHeight = Number(canvas.getAttribute('height')) || 220;
    canvas.width = Math.max(300, rect.width * ratio);
    canvas.height = cssHeight * ratio;
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    return { ctx, w: canvas.width / ratio, h: canvas.height / ratio };
  }

  static line(canvas, values, labels, color = '#63e6be', suffix = '') {
    const { ctx, w, h } = this.setup(canvas);
    const pad = { l: 22, r: 14, t: 20, b: 27 };
    const min = 0, max = Math.max(100, ...values, 1);
    ctx.clearRect(0,0,w,h);
    ctx.font = '9px system-ui'; ctx.fillStyle = 'rgba(150,165,190,.75)';
    ctx.strokeStyle = 'rgba(255,255,255,.075)'; ctx.lineWidth = 1;
    for (let i=0;i<4;i++) {
      const y = pad.t + (h-pad.t-pad.b) * (i/3);
      ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(w-pad.r,y); ctx.stroke();
    }
    if (!values.length) return;
    const x = i => values.length === 1 ? w/2 : pad.l + i*(w-pad.l-pad.r)/(values.length-1);
    const y = v => h-pad.b - ((v-min)/(max-min))*(h-pad.t-pad.b);
    const grad = ctx.createLinearGradient(0,pad.t,0,h-pad.b); grad.addColorStop(0, color+'45'); grad.addColorStop(1, color+'00');
    ctx.beginPath(); values.forEach((v,i)=> i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v))); ctx.lineTo(x(values.length-1),h-pad.b); ctx.lineTo(x(0),h-pad.b); ctx.closePath(); ctx.fillStyle=grad; ctx.fill();
    ctx.beginPath(); values.forEach((v,i)=> i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v))); ctx.strokeStyle=color; ctx.lineWidth=2.25; ctx.stroke();
    const step = Math.max(1, Math.floor(values.length/6));
    labels.forEach((label,i)=>{ if(i%step===0 || i===labels.length-1){ ctx.fillStyle='rgba(150,165,190,.72)';ctx.textAlign=i===0?'left':i===labels.length-1?'right':'center';ctx.fillText(label,x(i),h-8); }});
    const last = values.length-1; ctx.beginPath(); ctx.arc(x(last),y(values[last]),3.5,0,Math.PI*2); ctx.fillStyle=color; ctx.fill();
    if (suffix && values[last] != null) { ctx.fillStyle='rgba(240,245,255,.9)';ctx.textAlign='right';ctx.fillText(`${Math.round(values[last])}${suffix}`,w-pad.r,y(values[last])-9); }
  }

  static bars(canvas, values, labels, color = '#6ea8fe') {
    const { ctx, w, h } = this.setup(canvas); const pad={l:18,r:10,t:15,b:27}; ctx.clearRect(0,0,w,h);
    const max=Math.max(...values,240,1); const n=Math.max(1,values.length); const available=w-pad.l-pad.r; const gap=Math.max(2,available/(n*3.2)); const bw=Math.max(3,(available-gap*(n-1))/n);
    const step=Math.max(1,Math.floor(n/6));
    values.forEach((v,i)=>{ const bh=(v/max)*(h-pad.t-pad.b); const x=pad.l+i*(bw+gap), y=h-pad.b-bh; const grad=ctx.createLinearGradient(0,y,0,h-pad.b);grad.addColorStop(0,color);grad.addColorStop(1,'rgba(110,168,254,.16)');ctx.fillStyle=grad;ctx.beginPath();ctx.roundRect(x,y,bw,bh,Math.min(5,bw/2));ctx.fill();if(i%step===0||i===n-1){ctx.fillStyle='rgba(150,165,190,.7)';ctx.font='9px system-ui';ctx.textAlign='center';ctx.fillText(labels[i],x+bw/2,h-8);}});
  }
}

class LifeView {
  constructor(store, analytics, insights) {
    this.store = store; this.analytics = analytics; this.insights = insights; this.activeRange='week'; this.toastTimer=null;
  }
  q(s, root=document){ return root.querySelector(s); }
  qa(s, root=document){ return [...root.querySelectorAll(s)]; }
  esc(text=''){ const div=document.createElement('div'); div.textContent=String(text); return div.innerHTML; }
  icon(id){ return `<svg aria-hidden="true"><use href="#${id}"></use></svg>`; }
  formatMinutes(mins){ const h=Math.floor(mins/60),m=Math.round(mins%60);return `${h}h ${String(m).padStart(2,'0')}m`; }

  init() {
    this.renderDate(); this.applyTheme(); this.renderAll();
    window.addEventListener('resize', this.debounce(()=>{ if(document.getElementById('view-analytics').classList.contains('active')) this.renderAnalytics(this.activeRange); }, 150));
  }

  renderAll() { this.renderProfile(); this.renderToday(); this.renderGoals(); this.renderJournal(); this.renderSettings(); this.renderAnalytics(this.activeRange); }
  renderDate(){ const d=new Date(); this.q('#dateLabel').textContent=d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}); }
  renderProfile(){ const p=this.store.getProfile(); const name=p.name?.trim()||'You'; this.q('#avatarInitial').textContent=name[0].toUpperCase(); const hour=new Date().getHours(); const greeting=hour<12?'Good morning':hour<18?'Good afternoon':'Good evening'; this.q('#heroGreeting').textContent=`${greeting}, ${name}.`; const streak=this.analytics.streak(); this.q('#streakText').textContent=`${streak} day${streak===1?'':'s'} streak`; }
  applyTheme(){ document.documentElement.dataset.theme=this.store.getProfile().theme||'dark'; this.q('#themeToggle use').setAttribute('href',(this.store.getProfile().theme||'dark')==='dark'?'#i-sun':'#i-moon'); }

  renderToday(){
    const day=this.store.getToday(), goals=this.store.getGoals(); const done=day.tasks.filter(t=>t.done).length, total=day.tasks.length; const taskRate=total?Math.round(done/total*100):0;
    const goalAvg=goals.length?Math.round(goals.reduce((s,g)=>s+Number(g.progress||0),0)/goals.length):0; const sat=day.checkin?.satisfaction; const screen=this.analytics.screenMinutes(day); const score=this.analytics.dayScore(day);
    this.q('#heroScore').textContent=`${score}%`; this.q('#heroTasks').textContent=`${done}/${total}`; this.q('#heroFocus').textContent=this.formatMinutes(screen); this.q('#scoreRingValue').textContent=score; this.q('#scoreRing').style.strokeDashoffset=301.59*(1-score/100);
    this.q('#goalProgressMetric').textContent=`${goalAvg}%`; this.q('#taskProgressMetric').textContent=`${taskRate}%`; this.q('#taskMetricHint').textContent=`${done} completed`; this.q('#satisfactionMetric').textContent=sat?`${sat}/10`:'—'; this.q('#satisfactionMetricHint').textContent=sat>=8?'Strong day':sat>=6?'Steady':'Needs attention'; this.q('#screenMetric').textContent=this.formatMinutes(screen); this.q('#screenMetricHint').textContent=`Target ${this.store.getProfile().screenTargetHours}h`;
    ['mood','satisfaction','energy'].forEach(k=>{ this.q(`#${k}Range`).value=day.checkin?.[k]||7; this.q(`#${k}Value`).value=day.checkin?.[k]||7; });
    this.renderTasks(day.tasks); this.renderTimeline(day.activities); this.renderScreen(day.screen);
    const insight=this.insights.dailyInsight(); this.q('#insightTitle').textContent=insight.title; this.q('#insightText').textContent=insight.text;
  }

  renderTasks(tasks){ const root=this.q('#taskList'); if(!tasks.length){root.innerHTML='<div class="empty-state">No tasks yet. Add only what matters today.</div>';return;} root.innerHTML=tasks.map(t=>`<div class="task-item ${t.done?'done':''}" data-task="${t.id}"><button class="check-btn task-toggle" aria-label="Toggle task">${this.icon('i-check')}</button><div><div class="task-title">${this.esc(t.title)}</div><div class="task-meta"><i class="priority ${this.esc(t.priority)}"></i><span>${this.esc(t.priority)} priority</span></div></div><button class="delete-icon task-delete" aria-label="Delete task">×</button></div>`).join(''); }
  renderTimeline(items){ const root=this.q('#timelineList'); if(!items.length){root.innerHTML='<div class="empty-state">Log the main blocks of your day, not every minute.</div>';return;} root.innerHTML=items.map(a=>`<div class="timeline-item"><div class="timeline-time">${this.esc(a.time)}</div><div class="timeline-dot"></div><div class="timeline-copy"><strong>${this.esc(a.title)}</strong><span>${this.esc(a.category)}</span></div></div>`).join(''); }
  renderScreen(entries){ const total=entries.reduce((s,x)=>s+Number(x.minutes||0),0); const target=Math.max(1,this.store.getProfile().screenTargetHours*60); const degree=Math.min(360,total/target*360); this.q('#screenDonut').style.background=`conic-gradient(var(--blue) 0 ${degree}deg, rgba(255,255,255,.07) ${degree}deg 360deg)`; this.q('#screenDonutValue').textContent=total>=60?`${(total/60).toFixed(total%60?1:0)}h`:`${total}m`;
    const merged={}; entries.forEach(x=>merged[x.category]=(merged[x.category]||0)+Number(x.minutes||0)); const colors=['var(--blue)','var(--violet)','var(--mint)','var(--amber)','var(--danger)']; this.q('#screenLegend').innerHTML=Object.entries(merged).length?Object.entries(merged).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v],i)=>`<div class="legend-item"><i class="legend-swatch" style="background:${colors[i%colors.length]}"></i><span>${this.esc(k)}</span><strong>${this.formatMinutes(v)}</strong></div>`).join(''):'<div class="empty-state">No screen time logged.</div>'; }

  renderGoals(){ const goals=this.store.getGoals(); this.q('#goalCountLabel').textContent=`${goals.length} active`; this.q('#goalGrid').innerHTML=goals.length?goals.map(g=>`<article class="glass-panel goal-card" data-goal="${g.id}"><div class="goal-card-top"><div class="goal-icon">${this.icon('i-target')}</div><button class="delete-icon goal-delete" aria-label="Delete goal">×</button></div><h3>${this.esc(g.title)}</h3><p>${this.esc(g.note||'')}</p><div class="goal-progress-row"><div class="goal-progress-bar"><i style="width:${Number(g.progress)||0}%"></i></div><strong>${Number(g.progress)||0}%</strong></div><div class="goal-controls"><input class="goal-range" type="range" min="0" max="100" value="${Number(g.progress)||0}" aria-label="Goal progress" /></div></article>`).join(''):'<div class="empty-state">Create your first long-term goal.</div>'; }

  renderAnalytics(range='week') {
    this.activeRange=range; this.qa('#rangeTabs button').forEach(b=>b.classList.toggle('active',b.dataset.range===range)); const s=this.analytics.rangeStats(range); this.q('#analyticsAverage').textContent=`${s.averageScore}% avg`; this.q('#screenAverage').textContent=`${this.formatMinutes(s.averageScreen)} avg`;
    const sampled=this.sampleForRange(s.entries,range); const labels=sampled.map(x=>range==='year'?x.date.toLocaleDateString(undefined,{month:'short'}):x.date.toLocaleDateString(undefined,{month:'short',day:'numeric'})); CanvasCharts.line(this.q('#progressChart'),sampled.map(x=>this.analytics.dayScore(x.day)),labels,'#63e6be','%'); CanvasCharts.bars(this.q('#screenChart'),sampled.map(x=>this.analytics.screenMinutes(x.day)),labels,'#6ea8fe');
    const metrics=[['Mood',s.mood],['Satisfaction',s.satisfaction],['Energy',s.energy]]; this.q('#balanceBars').innerHTML=metrics.map(([k,v])=>`<div class="balance-row"><label><span>${k}</span><strong>${v? v.toFixed(1):'—'}/10</strong></label><div class="balance-track"><i style="width:${Math.max(0,Math.min(100,v*10))}%"></i></div></div>`).join('');
    this.renderHeatmap(); this.q('#analyticsInsights').innerHTML=this.insights.analyticsInsights(range).map(x=>`<div class="insight-mini"><strong>${this.esc(x.title)}</strong><p>${this.esc(x.text)}</p></div>`).join('');
  }

  sampleForRange(entries,range){
    if(range!=='year') return entries;
    const buckets=[];
    for(let i=0;i<entries.length;i+=30){
      const slice=entries.slice(i,i+30);
      const days=slice.filter(x=>x.day);
      if(!days.length){ buckets.push({date:slice[0]?.date||new Date(),day:null}); continue; }
      const avgScore=Math.round(days.reduce((sum,x)=>sum+this.analytics.dayScore(x.day),0)/days.length);
      const avgScreen=Math.round(days.reduce((sum,x)=>sum+this.analytics.screenMinutes(x.day),0)/days.length);
      const pseudo={
        tasks:Array.from({length:100},(_,idx)=>({done:idx<avgScore})),
        screen:[{minutes:avgScreen}],
        checkin:{mood:avgScore/10,satisfaction:avgScore/10,energy:avgScore/10}
      };
      buckets.push({date:slice[0]?.date||new Date(),day:pseudo});
    }
    return buckets;
  }

  renderHeatmap(){ const root=this.q('#heatmap'); const entries=this.analytics.dateRange('year').slice(-182); root.innerHTML=entries.map(x=>{ const score=this.analytics.dayScore(x.day); const level=!x.day?0:score>=80?4:score>=65?3:score>=45?2:1; const tip=`${x.date.toLocaleDateString(undefined,{month:'short',day:'numeric'})}: ${score}%`; return `<i class="heat-cell" data-level="${level}" data-tip="${tip}"></i>`; }).join(''); this.q('#heatmapHint').textContent='Last 6 months'; }

  renderJournal(){ const r=this.store.getToday().reflection||{}; this.q('#workedText').value=r.worked||''; this.q('#improveText').value=r.improve||''; this.q('#tomorrowText').value=r.tomorrow||''; this.renderNotes(); }
  renderNotes(){ const notes=this.store.getNotes(); this.q('#notesList').innerHTML=notes.length?notes.map(n=>`<div class="note-item" data-note="${n.id}"><p>${this.esc(n.text)}</p><span>${new Date(n.createdAt).toLocaleString()}</span></div>`).join(''):'<div class="empty-state">Small thoughts, ideas, reminders—keep them here.</div>'; }
  renderSettings(){ const p=this.store.getProfile(); this.q('#profileName').value=p.name||''; this.q('#screenTarget').value=p.screenTargetHours||4; }

  setView(name){ this.qa('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`)); this.qa('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===name)); this.q('#pageTitle').textContent=({today:'Today',goals:'Goals',analytics:'Analytics',journal:'Journal',settings:'Settings'})[name]||'LifeGlass'; window.scrollTo({top:0,behavior:'smooth'}); if(name==='analytics') setTimeout(()=>this.renderAnalytics(this.activeRange),40); }

  openModal(type){ const form=this.q('#modalForm'), title=this.q('#modalTitle'); const now=new Date(); const hh=String(now.getHours()).padStart(2,'0'), mm=String(now.getMinutes()).padStart(2,'0');
    const fields={
      task:{ title:'Add task', html:`<label>Task<input name="title" required maxlength="90" placeholder="What matters today?" /></label><label>Priority<select name="priority"><option value="high">High</option><option value="medium" selected>Medium</option><option value="low">Low</option></select></label>` },
      activity:{ title:'Log activity', html:`<label>Activity<input name="title" required maxlength="90" placeholder="Deep work, exercise, meeting..." /></label><div class="form-row"><label>Time<input type="time" name="time" value="${hh}:${mm}" required /></label><label>Category<select name="category"><option>Work</option><option>Learning</option><option>Health</option><option>Family</option><option>Life</option><option>Rest</option></select></label></div>` },
      screen:{ title:'Log screen time', html:`<div class="form-row"><label>Category<select name="category"><option>Work</option><option>Learning</option><option>Social</option><option>Entertainment</option><option>Other</option></select></label><label>Minutes<input type="number" name="minutes" min="1" max="1440" value="30" required /></label></div>` },
      goal:{ title:'New goal', html:`<label>Goal<input name="title" required maxlength="90" placeholder="What are you building toward?" /></label><label>Short reason<textarea name="note" rows="3" maxlength="180" placeholder="Why does it matter?"></textarea></label><div class="form-row"><label>Category<select name="category"><option>Growth</option><option>Health</option><option>Career</option><option>Purpose</option><option>Relationships</option><option>Finance</option><option>Other</option></select></label><label>Horizon<select name="target"><option>Continuous</option><option>30 days</option><option>90 days</option><option>1 year</option><option>Long-term</option></select></label></div>` }
    }[type];
    title.textContent=fields.title; form.dataset.type=type; form.innerHTML=fields.html+`<button class="primary-btn" type="submit">Save</button>`; this.q('#modalBackdrop').classList.add('show'); this.q('#modalBackdrop').setAttribute('aria-hidden','false'); setTimeout(()=>form.querySelector('input,textarea,select')?.focus(),80);
  }
  closeModal(){ this.q('#modalBackdrop').classList.remove('show'); this.q('#modalBackdrop').setAttribute('aria-hidden','true'); }
  toast(message){ const el=this.q('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(this.toastTimer); this.toastTimer=setTimeout(()=>el.classList.remove('show'),1900); }
  debounce(fn,wait){ let t; return(...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),wait)}; }
}
