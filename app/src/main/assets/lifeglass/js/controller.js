class LifeController {
  constructor(store, analytics, insights, view) { this.store=store; this.analytics=analytics; this.insights=insights; this.view=view; }

  init() {
    this.view.init();
    document.addEventListener('click', e => this.handleClick(e));
    document.addEventListener('input', e => this.handleInput(e));
    document.querySelector('#modalForm').addEventListener('submit', e => this.handleModalSubmit(e));
    document.querySelector('#modalBackdrop').addEventListener('click', e => { if(e.target.id==='modalBackdrop') this.view.closeModal(); });
    document.addEventListener('keydown', e=>{ if(e.key==='Escape') this.view.closeModal(); });
  }

  handleClick(e) {
    const nav=e.target.closest('[data-view]'); if(nav){ this.view.setView(nav.dataset.view); return; }
    const link=e.target.closest('[data-view-link]'); if(link){ this.view.setView(link.dataset.viewLink); return; }
    const modal=e.target.closest('[data-open-modal]'); if(modal){ this.view.openModal(modal.dataset.openModal); return; }
    if(e.target.closest('#closeModal')) { this.view.closeModal(); return; }

    const task=e.target.closest('[data-task]');
    if(task && e.target.closest('.task-toggle')) { this.store.toggleTask(task.dataset.task); this.refresh('Task updated'); return; }
    if(task && e.target.closest('.task-delete')) { this.store.deleteTask(task.dataset.task); this.refresh('Task removed'); return; }

    const goal=e.target.closest('[data-goal]');
    if(goal && e.target.closest('.goal-delete')) { if(confirm('Delete this goal?')){ this.store.deleteGoal(goal.dataset.goal); this.refresh('Goal removed'); } return; }

    if(e.target.closest('#saveCheckin')) { this.saveCheckin(); return; }
    if(e.target.closest('#saveReflection')) { this.saveReflection(); return; }
    if(e.target.closest('#addNote')) { this.addNote(); return; }
    if(e.target.closest('#saveSettings')) { this.saveSettings(); return; }
    if(e.target.closest('#themeToggle')) { this.toggleTheme(); return; }
    if(e.target.closest('#profileButton')) { this.view.setView('settings'); return; }
    if(e.target.closest('#exportData')) { this.exportData(); return; }
    if(e.target.closest('#importData')) { document.querySelector('#importFile').click(); return; }
    if(e.target.closest('#resetData')) { this.resetData(); return; }

    const range=e.target.closest('#rangeTabs button'); if(range){ this.view.renderAnalytics(range.dataset.range); return; }
  }

  handleInput(e) {
    if(['moodRange','satisfactionRange','energyRange'].includes(e.target.id)) document.querySelector(`#${e.target.id.replace('Range','Value')}`).value=e.target.value;
    if(e.target.matches('.goal-range')) { const card=e.target.closest('[data-goal]'); this.store.updateGoalProgress(card.dataset.goal,e.target.value); card.querySelector('.goal-progress-bar i').style.width=`${e.target.value}%`; card.querySelector('.goal-progress-row strong').textContent=`${e.target.value}%`; this.view.renderToday(); }
    if(e.target.id==='importFile') this.importData(e.target.files?.[0]);
  }

  handleModalSubmit(e) {
    e.preventDefault(); const fd=new FormData(e.target), type=e.target.dataset.type;
    if(type==='task') this.store.addTask({ title:fd.get('title').trim(), priority:fd.get('priority') });
    if(type==='activity') this.store.addActivity({ title:fd.get('title').trim(), time:fd.get('time'), category:fd.get('category') });
    if(type==='screen') this.store.addScreen({ category:fd.get('category'), minutes:Number(fd.get('minutes')) });
    if(type==='goal') this.store.addGoal({ title:fd.get('title').trim(), note:fd.get('note').trim(), category:fd.get('category'), target:fd.get('target') });
    this.view.closeModal(); this.refresh(`${type[0].toUpperCase()+type.slice(1)} saved`);
  }

  saveCheckin(){ this.store.saveCheckin({ mood:Number(document.querySelector('#moodRange').value), satisfaction:Number(document.querySelector('#satisfactionRange').value), energy:Number(document.querySelector('#energyRange').value) }); this.refresh('Check-in saved'); }
  saveReflection(){ this.store.saveReflection({ worked:document.querySelector('#workedText').value.trim(), improve:document.querySelector('#improveText').value.trim(), tomorrow:document.querySelector('#tomorrowText').value.trim() }); document.querySelector('#reflectionSaved').textContent='Saved just now'; this.view.renderToday(); this.view.toast('Reflection saved'); }
  addNote(){ const text=prompt('Write a quick note:'); if(text?.trim()){ this.store.addNote(text.trim()); this.view.renderNotes(); this.view.toast('Note added'); } }
  saveSettings(){ const name=document.querySelector('#profileName').value.trim()||'You'; const screen=Math.max(0,Math.min(24,Number(document.querySelector('#screenTarget').value)||4)); this.store.updateProfile({name,screenTargetHours:screen}); this.refresh('Settings saved'); }
  toggleTheme(){ const next=(this.store.getProfile().theme||'dark')==='dark'?'light':'dark'; this.store.updateProfile({theme:next}); this.view.applyTheme(); this.view.renderAnalytics(this.view.activeRange); }

  exportData(){ const json=JSON.stringify(this.store.data,null,2); const filename=`lifeglass-backup-${this.store.todayKey()}.json`; if(window.LifeGlassAndroid?.exportBackup){ window.LifeGlassAndroid.exportBackup(json,filename); this.view.toast('Choose where to save your backup'); return; } const blob=new Blob([json],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); this.view.toast('Backup exported'); }
  async importData(file){ if(!file) return; try{ const text=await file.text(); const next=JSON.parse(text); this.store.replaceData(next); this.view.renderAll(); this.view.applyTheme(); this.view.toast('Backup imported'); }catch(err){ alert(err.message||'Could not import this file.'); } finally { document.querySelector('#importFile').value=''; } }
  resetData(){ if(confirm('Clear all LifeGlass data on this browser?')){ this.store.reset(); this.view.renderAll(); this.view.applyTheme(); this.view.toast('LifeGlass reset'); } }

  refresh(message){ this.view.renderAll(); if(message) this.view.toast(message); }
}
