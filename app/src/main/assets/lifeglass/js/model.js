class LifeStore {
  constructor(key = 'lifeglass.v1') {
    this.key = key;
    this.data = this.load();
  }

  todayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  uid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  defaultData() {
    const data = {
      version: 1,
      profile: { name: 'You', screenTargetHours: 4, theme: 'dark' },
      goals: [
        { id: this.uid('goal'), title: 'Deep work & learning', note: 'Protect focused time for meaningful growth.', progress: 62, category: 'Growth', target: 'Continuous' },
        { id: this.uid('goal'), title: 'Health & energy', note: 'Move, recover and protect daily energy.', progress: 48, category: 'Health', target: 'Continuous' },
        { id: this.uid('goal'), title: 'Meaningful contribution', note: 'Create work that helps people.', progress: 37, category: 'Purpose', target: 'Long-term' }
      ],
      days: {},
      notes: []
    };

    // Demonstration history so charts are useful on first open.
    const now = new Date();
    for (let i = 13; i >= 1; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = this.todayKey(d);
      const wave = Math.sin(i * .85);
      const sat = Math.max(4, Math.min(9, Math.round(6.5 + wave * 1.4)));
      const mood = Math.max(4, Math.min(9, Math.round(6.7 + Math.cos(i * .63) * 1.3)));
      const energy = Math.max(4, Math.min(9, Math.round(6.2 + Math.sin(i * .47) * 1.5)));
      const taskCount = 3 + (i % 3);
      const completed = Math.max(1, Math.min(taskCount, taskCount - (i % 3 === 0 ? 2 : 1)));
      data.days[key] = {
        date: key,
        checkin: { mood, satisfaction: sat, energy },
        tasks: Array.from({ length: taskCount }, (_, idx) => ({ id: this.uid('task'), title: `Sample task ${idx + 1}`, priority: idx === 0 ? 'high' : 'medium', done: idx < completed, createdAt: `${key}T08:00:00` })),
        activities: [{ id: this.uid('act'), time: '09:00', title: 'Focused work', category: 'Work' }, { id: this.uid('act'), time: '18:30', title: 'Personal time', category: 'Life' }],
        screen: [
          { id: this.uid('screen'), category: 'Work', minutes: 120 + (i % 4) * 18 },
          { id: this.uid('screen'), category: 'Social', minutes: 32 + (i % 5) * 10 },
          { id: this.uid('screen'), category: 'Learning', minutes: 35 + (i % 3) * 16 }
        ],
        reflection: { worked: '', improve: '', tomorrow: '' }
      };
    }
    return data;
  }

  ensureToday() {
    const key = this.todayKey();
    if (!this.data.days[key]) {
      this.data.days[key] = {
        date: key,
        checkin: { mood: 7, satisfaction: 7, energy: 7 },
        tasks: [],
        activities: [],
        screen: [],
        reflection: { worked: '', improve: '', tomorrow: '' }
      };
      this.save();
    }
    return this.data.days[key];
  }

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) {
        const initial = this.defaultData();
        localStorage.setItem(this.key, JSON.stringify(initial));
        return initial;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.days) throw new Error('Invalid store');
      return parsed;
    } catch (err) {
      const fallback = this.defaultData();
      localStorage.setItem(this.key, JSON.stringify(fallback));
      return fallback;
    }
  }

  save() { localStorage.setItem(this.key, JSON.stringify(this.data)); }
  getToday() { return this.ensureToday(); }
  getProfile() { return this.data.profile; }
  getGoals() { return this.data.goals; }
  getNotes() { return this.data.notes; }

  addTask(task) {
    const day = this.ensureToday();
    day.tasks.unshift({ id: this.uid('task'), done: false, createdAt: new Date().toISOString(), ...task });
    this.save();
  }
  toggleTask(id) { const t = this.ensureToday().tasks.find(x => x.id === id); if (t) t.done = !t.done; this.save(); }
  deleteTask(id) { const d = this.ensureToday(); d.tasks = d.tasks.filter(x => x.id !== id); this.save(); }

  saveCheckin(checkin) { this.ensureToday().checkin = { ...checkin }; this.save(); }
  addActivity(activity) { this.ensureToday().activities.push({ id: this.uid('act'), ...activity }); this.ensureToday().activities.sort((a,b) => a.time.localeCompare(b.time)); this.save(); }
  addScreen(entry) { this.ensureToday().screen.push({ id: this.uid('screen'), ...entry }); this.save(); }
  saveReflection(reflection) { this.ensureToday().reflection = { ...reflection }; this.save(); }

  addNote(text) { this.data.notes.unshift({ id: this.uid('note'), text, createdAt: new Date().toISOString() }); this.save(); }
  deleteNote(id) { this.data.notes = this.data.notes.filter(x => x.id !== id); this.save(); }

  addGoal(goal) { this.data.goals.push({ id: this.uid('goal'), progress: 0, ...goal }); this.save(); }
  updateGoalProgress(id, value) { const g = this.data.goals.find(x => x.id === id); if (g) g.progress = Math.max(0, Math.min(100, Number(value) || 0)); this.save(); }
  deleteGoal(id) { this.data.goals = this.data.goals.filter(x => x.id !== id); this.save(); }

  updateProfile(patch) { this.data.profile = { ...this.data.profile, ...patch }; this.save(); }

  replaceData(next) {
    if (!next || typeof next !== 'object' || !next.days || !next.profile || !Array.isArray(next.goals)) throw new Error('This backup is not valid LifeGlass data.');
    this.data = next;
    this.save();
  }

  reset() { localStorage.removeItem(this.key); this.data = this.defaultData(); this.save(); }
}

class AnalyticsModel {
  constructor(store) { this.store = store; }

  dateRange(type = 'week') {
    const count = type === 'week' ? 7 : type === 'month' ? 30 : 365;
    const out = [];
    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      out.push({ date: d, key: this.store.todayKey(d), day: this.store.data.days[this.store.todayKey(d)] || null });
    }
    return out;
  }

  taskRate(day) {
    if (!day || !day.tasks?.length) return 0;
    return day.tasks.filter(t => t.done).length / day.tasks.length;
  }

  screenMinutes(day) { return (day?.screen || []).reduce((sum, x) => sum + Number(x.minutes || 0), 0); }

  dayScore(day) {
    if (!day) return 0;
    const task = this.taskRate(day) * 100;
    const c = day.checkin || {};
    const wellbeing = ((Number(c.satisfaction || 0) + Number(c.mood || 0) + Number(c.energy || 0)) / 30) * 100;
    const target = Math.max(1, Number(this.store.getProfile().screenTargetHours || 4) * 60);
    const screen = this.screenMinutes(day);
    const digital = screen <= target ? 100 : Math.max(20, 100 - ((screen - target) / target) * 70);
    return Math.round(task * .45 + wellbeing * .4 + digital * .15);
  }

  rangeStats(type) {
    const entries = this.dateRange(type);
    const populated = entries.filter(x => x.day);
    const avg = fn => populated.length ? populated.reduce((s,x) => s + fn(x.day), 0) / populated.length : 0;
    return {
      entries,
      averageScore: Math.round(avg(d => this.dayScore(d))),
      averageScreen: Math.round(avg(d => this.screenMinutes(d))),
      mood: avg(d => Number(d.checkin?.mood || 0)),
      satisfaction: avg(d => Number(d.checkin?.satisfaction || 0)),
      energy: avg(d => Number(d.checkin?.energy || 0)),
      taskRate: avg(d => this.taskRate(d))
    };
  }

  streak() {
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 4000; i++) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const day = this.store.data.days[this.store.todayKey(d)];
      const active = day && (day.tasks?.some(t => t.done) || day.activities?.length || day.reflection?.worked || day.screen?.length);
      if (!active) break;
      streak++;
    }
    return streak;
  }
}

class InsightEngine {
  constructor(store, analytics) { this.store = store; this.analytics = analytics; }

  dailyInsight() {
    const stats = this.analytics.rangeStats('week');
    const today = this.store.getToday();
    const screen = this.analytics.screenMinutes(today);
    const target = this.store.getProfile().screenTargetHours * 60;
    const taskRate = this.analytics.taskRate(today);

    if (today.tasks.length >= 3 && taskRate >= .75) return { title: 'Execution is strong today.', text: 'You are converting plans into finished work. Protect the next focused block rather than adding more tasks.' };
    if (screen > target * 1.2) return { title: 'Your screen time is above target.', text: 'Most useful correction: reduce one low-value digital block instead of trying to change the whole day.' };
    if (stats.energy && stats.energy < 5.5) return { title: 'Energy is the limiting signal.', text: 'Your recent check-ins suggest that recovery may improve progress more than pushing harder.' };
    if (stats.averageScore >= 70) return { title: 'Your recent rhythm is stable.', text: 'Consistency is working. Keep the system simple and avoid changing what is already sustainable.' };
    return { title: 'Build the evidence first.', text: 'A few honest check-ins will make the weekly and monthly patterns more useful.' };
  }

  analyticsInsights(type) {
    const s = this.analytics.rangeStats(type);
    const out = [];
    if (s.taskRate >= .7) out.push({ title:'Strong completion', text:`You finish about ${Math.round(s.taskRate*100)}% of logged tasks in this range.` });
    else out.push({ title:'Completion gap', text:`Your logged task completion is ${Math.round(s.taskRate*100)}%. Consider planning fewer, clearer tasks.` });

    const target = this.store.getProfile().screenTargetHours * 60;
    if (s.averageScreen > target) out.push({ title:'Digital load', text:`Average screen time is ${this.formatMinutes(s.averageScreen)}, above your ${this.formatMinutes(target)} target.` });
    else out.push({ title:'Digital balance', text:`Average screen time is within your chosen daily target.` });

    const balance = (s.mood + s.satisfaction + s.energy) / 3;
    out.push({ title:'Wellbeing signal', text: balance >= 7 ? 'Mood, satisfaction and energy are trending in a healthy range.' : balance >= 5 ? 'Your check-ins are mixed. Look for which days protect energy best.' : 'Your recent wellbeing scores are low. Reduce pressure and identify the strongest recurring drain.' });
    return out;
  }

  formatMinutes(mins) { const h = Math.floor(mins/60), m = Math.round(mins%60); return `${h}h ${String(m).padStart(2,'0')}m`; }
}
