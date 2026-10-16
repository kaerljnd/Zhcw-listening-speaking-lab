const C = window.COURSE;
if (!C) throw new Error('Lesson configuration is missing.');

const AUDIO = 'assets/audio/';
const STORAGE_KEY = `zhcw.${C.id}.v2`;
const MIC_SESSION_KEY = `zhcw.${C.id}.microphoneReady`;
const DB_NAME = 'zhcw-listening-speaking-lab';
const RECORD_PREFIX = `${C.id}:`;

const navItems = [
  ['home', '路线', '今日学习路线'],
  ['exam', '1', '冷启动 · 考试模式'],
  ['replay', '2', '重听 · 证据定位'],
  ['vocab', '3', '文本分析 · 词汇教学'],
  ['repeat', '4', '证据句复述'],
  ['interview', '5', C.speakingTitle],
  ['transfer', '6', '迁移与退出检测']
];

const defaultState = () => ({
  version: 2,
  activeScreen: 'home',
  completed: {},
  plays: {},
  exam: { answers: {}, confidence: {}, phase: 1, wrong: [], selfLocate: {}, revision: {} },
  replay: { current: 0, items: {} },
  vocab: { current: 0, items: {} },
  repeat: { current: 0, items: {} },
  interview: { current: 0, items: {} },
  transfer: { plan: '', reviewWords: '', reflection: '' },
  teacherNotes: { summary: '' },
  log: []
});

let state = loadState();
let appMode = 'student';
let activeRecorder = null;
let activeTimer = null;
let toastTimer = null;
let microphoneState = sessionStorage.getItem(MIC_SESSION_KEY) === '1' ? 'granted' : 'unknown';

const screen = document.getElementById('screen');
const nav = document.getElementById('task-nav');
const titleEl = document.getElementById('screen-title');
const eyebrowEl = document.getElementById('screen-eyebrow');
document.getElementById('lesson-chip').textContent = `${C.lessonLabel} · ${C.title}`;
document.title = `Zhcw ${C.lessonLabel}｜${C.title}`;

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return parsed && parsed.version === 2 ? { ...defaultState(), ...parsed } : defaultState();
  } catch { return defaultState(); }
}

function saveState(message = '') {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateProgress();
  renderNav();
  if (message) toast(message);
}

function logEvent(type, detail = {}) {
  state.log.push({ at: new Date().toISOString(), type, ...detail });
  if (state.log.length > 400) state.log = state.log.slice(-400);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
}

function normalize(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

function paper(title, subtitle, body, badge = '') {
  return `<article class="paper"><div class="paper-head"><div><div class="kicker">${escapeHtml(C.lessonLabel.toUpperCase())}</div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div>${badge ? `<span class="badge">${escapeHtml(badge)}</span>` : ''}</div>${body}</article>`;
}

function modeStrip(active) {
  const modes = [
    ['exam', '冷启动', '只做题，不提前看文本'],
    ['replay', '重听模式', '定位证据句与听辨障碍'],
    ['vocab', '文本分析', '词义、读音与原文语境']
  ];
  return `<div class="mode-strip">${modes.map(([id, a, b]) => `<div class="mode-card ${active === id ? 'active' : ''}"><strong>${a}</strong><span>${b}</span></div>`).join('')}</div>`;
}

function choice(name, value, label, checked = false) {
  return `<label class="choice"><input type="radio" name="${escapeHtml(name)}" value="${escapeHtml(value)}" ${checked ? 'checked' : ''}><span>${escapeHtml(label)}</span></label>`;
}

function audioPanel(file, label) {
  const id = file.replace(/\W/g, '_');
  return `<div class="audio-panel"><div class="audio-icon">▶</div><audio controls preload="metadata" data-audio-id="${id}"><source src="${AUDIO}${file}" type="audio/mpeg"></audio><div class="play-count">${escapeHtml(label)} · 已播放 <span data-play-count="${id}">${state.plays[id] || 0}</span> 次</div></div>`;
}

function attachAudioTracking() {
  document.querySelectorAll('audio[data-audio-id]').forEach(audio => {
    if (audio.dataset.trackingAttached === '1') return;
    audio.dataset.trackingAttached = '1';
    let countedForCurrentRun = false;
    const countPlayback = () => {
      if (countedForCurrentRun) return;
      countedForCurrentRun = true;
      const id = audio.dataset.audioId;
      state.plays[id] = (state.plays[id] || 0) + 1;
      document.querySelectorAll(`[data-play-count="${id}"]`).forEach(x => x.textContent = state.plays[id]);
      if (state.activeScreen === 'replay') {
        const btn = document.getElementById('reveal-evidence');
        if (btn) {
          const left = Math.max(0, 2 - state.plays[id]);
          btn.disabled = left > 0;
          btn.textContent = left ? `还需播放 ${left} 遍` : '显示原文并复述';
        }
      }
      saveState();
    };
    audio.addEventListener('play', countPlayback);
    audio.addEventListener('playing', countPlayback);
    audio.addEventListener('timeupdate', () => {
      if (!audio.paused && audio.currentTime > 0) countPlayback();
    });
    audio.addEventListener('pause', () => { countedForCurrentRun = false; });
    audio.addEventListener('ended', () => { countedForCurrentRun = false; });
  });
}

function renderNav() {
  const items = appMode === 'teacher' ? [...navItems, ['dashboard', 'T', '教师数据面板']] : navItems;
  nav.innerHTML = items.map(([id, num, label]) => {
    const done = state.completed[id] || id === 'home';
    return `<button class="nav-item ${state.activeScreen === id ? 'active' : ''} ${done ? 'done' : ''}" data-nav="${id}"><span class="nav-num">${num}</span><span>${escapeHtml(label)}</span><span class="nav-status">${done ? '✓' : '○'}</span></button>`;
  }).join('');
  nav.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.nav)));
}

function updateProgress() {
  const ids = navItems.filter(x => x[0] !== 'home').map(x => x[0]);
  const pct = Math.round(ids.filter(id => state.completed[id]).length / ids.length * 100);
  document.getElementById('progress-text').textContent = `${pct}%`;
  document.getElementById('progress-bar').style.width = `${pct}%`;
}

function navigate(id) {
  if (id === 'dashboard' && appMode !== 'teacher') return;
  state.activeScreen = id;
  saveState();
  document.querySelector('.sidebar').classList.remove('open');
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function render() {
  const current = [...navItems, ['dashboard', 'T', '教师数据面板']].find(x => x[0] === state.activeScreen) || navItems[0];
  titleEl.textContent = current[2];
  eyebrowEl.textContent = appMode === 'teacher' ? 'TEACHER DASHBOARD' : 'STUDENT WORKSPACE';
  const routes = { home: renderHome, exam: renderExam, replay: renderReplay, vocab: renderVocab, repeat: renderRepeat, interview: renderInterview, transfer: renderTransfer, dashboard: renderDashboard };
  (routes[state.activeScreen] || renderHome)();
  attachAudioTracking();
  bindRecordButtons();
  loadRecordingPreviews();
  renderNav();
  updateProgress();
}

function renderHome() {
  const body = `<div class="paper-body">
    <div class="instruction"><strong>听力和口语合并训练。</strong><span>先通过真题冷听找词汇缺口，再完成读音、词义、证据句复述和同主题口语迁移。无需纸笔，文字与录音会保存在当前浏览器。</span></div>
    <div class="permission-card"><div class="permission-icon">🎙</div><div class="permission-copy"><strong>开始前统一开启麦克风</strong><span>首次使用请选择“访问该网站时允许”。通过一键启动文件进入，后续录音通常不会重复询问。</span><span class="permission-status" id="microphone-status">正在检查…</span></div><button class="secondary-btn" id="microphone-permission-btn">检查并开启</button></div>
    <div class="route-grid">
      <div class="route-card"><div class="route-index">01</div><strong>冷听做题</strong><p>只公布错题数量，再训练自我定位。</p></div>
      <div class="route-card"><div class="route-index">02</div><strong>证据重听</strong><p>重听必要上下文，找出未辨别的词句。</p></div>
      <div class="route-card"><div class="route-index">03</div><strong>词汇教学</strong><p>逐个显示读音、中文词义和原文语境。</p></div>
      <div class="route-card"><div class="route-index">04</div><strong>复述迁移</strong><p>把新词用于复述和${escapeHtml(C.speakingTitle)}。</p></div>
    </div>
    <div class="control-row" style="margin-top:24px"><button class="primary-btn" id="start-lesson">开启麦克风并开始 ${escapeHtml(C.lessonLabel)}</button><button class="secondary-btn" id="teacher-shortcut">查看已有记录</button></div>
  </div>`;
  screen.innerHTML = paper(C.title, C.subtitle, body, '无纸化课堂');
  document.getElementById('microphone-permission-btn').addEventListener('click', requestMicrophoneAccess);
  document.getElementById('start-lesson').addEventListener('click', async () => { const ready = microphoneState === 'granted' || await requestMicrophoneAccess(); if (ready) navigate('exam'); });
  document.getElementById('teacher-shortcut').addEventListener('click', () => { appMode = 'teacher'; document.getElementById('mode-toggle').textContent = '返回学生端'; navigate('dashboard'); });
  refreshMicrophoneStatus();
}

function updateMicrophoneStatus() {
  const status = document.getElementById('microphone-status');
  if (!status) return;
  const map = { granted: '已允许：后续录音将直接开始', denied: '已阻止：请在地址栏权限中改为允许', error: '未检测到可用麦克风', prompt: '尚未授权：点击右侧按钮开启', unknown: '尚未授权：点击右侧按钮开启' };
  status.textContent = map[microphoneState] || map.unknown;
  status.dataset.state = microphoneState;
}

async function refreshMicrophoneStatus() {
  if (!navigator.mediaDevices?.getUserMedia) { microphoneState = 'error'; updateMicrophoneStatus(); return; }
  try {
    if (navigator.permissions?.query) {
      const permission = await navigator.permissions.query({ name: 'microphone' });
      microphoneState = permission.state;
      permission.onchange = () => { microphoneState = permission.state; updateMicrophoneStatus(); };
    }
  } catch { microphoneState = sessionStorage.getItem(MIC_SESSION_KEY) === '1' ? 'granted' : 'prompt'; }
  updateMicrophoneStatus();
}

async function requestMicrophoneAccess() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    microphoneState = 'granted';
    sessionStorage.setItem(MIC_SESSION_KEY, '1');
    updateMicrophoneStatus();
    toast('麦克风已开启');
    return true;
  } catch { microphoneState = 'denied'; updateMicrophoneStatus(); toast('未能开启麦克风，请检查浏览器权限'); return false; }
}

function renderExam() {
  const e = state.exam;
  let body = `${modeStrip('exam')}<div class="instruction"><strong>规则：</strong><span>只听完整材料并作答，不看文本、不查词。每题同时标记信心：A=听清依据，B=理解大意，C=主要靠猜。</span></div>${audioPanel(C.fullAudio, '完整真题片段')}`;
  if (e.phase === 1) {
    body += C.examQuestions.map((q, i) => `<div class="question-card"><header><h3>Q${i + 1}</h3><span class="badge">冷启动</span></header><div class="question-text">${escapeHtml(q.question)}</div>${q.options.map((o, j) => `<label class="exam-option"><input type="radio" name="exam-${i}" value="${j}" ${Number(e.answers[i]) === j ? 'checked' : ''}>${String.fromCharCode(65 + j)}. ${escapeHtml(o)}</label>`).join('')}<div class="field" style="margin-top:12px"><label>信心标记</label><select data-confidence="${i}"><option value="">请选择</option><option value="A" ${e.confidence[i] === 'A' ? 'selected' : ''}>A 听清并能说出依据</option><option value="B" ${e.confidence[i] === 'B' ? 'selected' : ''}>B 理解大意，依据不完整</option><option value="C" ${e.confidence[i] === 'C' ? 'selected' : ''}>C 主要依靠猜测或排除</option></select></div></div>`).join('');
    body += `<button class="primary-btn" id="submit-exam">提交冷启动答案</button>`;
  } else if (e.phase === 2) {
    body += `<div class="question-card"><div class="split-callout"><div><span class="field-label">本次错误数量</span><div class="wrong-count">${e.wrong.length}</div><div class="locked-answer">暂不公布题号和正确答案</div></div><div><span class="field-label">先判断自己可能错在哪里</span>${C.examQuestions.map((_, i) => `<label class="exam-option"><input type="checkbox" data-self-locate="${i}" ${e.selfLocate[i] ? 'checked' : ''}>我认为 Q${i + 1} 可能有问题</label>`).join('')}</div></div><button class="primary-btn" id="reveal-wrong">确认自我定位并公布错题号</button></div>`;
  } else {
    body += `<div class="question-card"><div class="instruction"><strong>实际错题：</strong><span>${e.wrong.length ? e.wrong.map(i => `Q${i + 1}`).join('、') : '本次全对；仍需处理所有 C 类题和部分 B 类题。'}</span></div>${e.wrong.map(i => { const q = C.examQuestions[i]; return `<div class="field"><label>Q${i + 1} 重新选择（仍不显示正确答案）</label><select data-revision="${i}"><option value="">请选择</option>${q.options.map((o, j) => `<option value="${j}" ${Number(e.revision[i]) === j ? 'selected' : ''}>${String.fromCharCode(65 + j)}. ${escapeHtml(o)}</option>`).join('')}</select></div>`; }).join('')}<button class="primary-btn" id="to-replay">进入重听模式</button></div>`;
  }
  screen.innerHTML = paper('冷启动 · 考试模式', '完整播放后作答；程序先只反馈错题数量。', `<div class="paper-body">${body}</div>`, '模式 1/3');
  attachAudioTracking();
  document.querySelectorAll('input[name^="exam-"]').forEach(x => x.addEventListener('change', ev => { const i = Number(ev.target.name.split('-')[1]); state.exam.answers[i] = Number(ev.target.value); saveState(); }));
  document.querySelectorAll('[data-confidence]').forEach(x => x.addEventListener('change', ev => { state.exam.confidence[Number(ev.target.dataset.confidence)] = ev.target.value; saveState(); }));
  if (document.getElementById('submit-exam')) document.getElementById('submit-exam').addEventListener('click', () => {
    const ready = C.examQuestions.every((_, i) => e.answers[i] !== undefined && e.confidence[i]);
    if (!ready) return toast('请完成全部题目和信心标记');
    e.wrong = C.examQuestions.map((q, i) => Number(e.answers[i]) === q.answer ? null : i).filter(x => x !== null);
    e.phase = 2; logEvent('exam_submitted', { wrongCount: e.wrong.length }); saveState(); renderExam();
  });
  document.querySelectorAll('[data-self-locate]').forEach(x => x.addEventListener('change', ev => { e.selfLocate[Number(ev.target.dataset.selfLocate)] = ev.target.checked; saveState(); }));
  if (document.getElementById('reveal-wrong')) document.getElementById('reveal-wrong').addEventListener('click', () => { e.phase = 3; saveState(); renderExam(); });
  document.querySelectorAll('[data-revision]').forEach(x => x.addEventListener('change', ev => { e.revision[Number(ev.target.dataset.revision)] = Number(ev.target.value); saveState(); }));
  if (document.getElementById('to-replay')) document.getElementById('to-replay').addEventListener('click', () => { state.completed.exam = true; saveState(); navigate('replay'); });
}

function renderReplay() {
  const idx = Math.max(0, Math.min(state.replay.current, C.evidence.length - 1));
  const item = C.evidence[idx];
  const r = state.replay.items[item.id] || {};
  const playId = item.audio.replace(/\W/g, '_');
  const plays = state.plays[playId] || 0;
  const collected = r.collected || false;
  const body = `${modeStrip('replay')}<div class="instruction"><strong>每段至少听两遍。</strong><span>第一遍抓意思，第二遍尽量还原原句；两遍后才能显示文本。准确标出障碍比反复盲听更重要。</span></div><div class="focus-pager"><button class="small-btn" id="replay-prev" ${idx === 0 ? 'disabled' : ''}>← 上一段</button><div><strong>${idx + 1} / ${C.evidence.length}</strong><span>${escapeHtml(item.label)}</span></div><button class="small-btn" id="replay-next" ${idx === C.evidence.length - 1 || !r.finished ? 'disabled' : ''}>下一段 →</button></div><div class="question-card"><header><h3>${escapeHtml(item.label)}</h3><span class="badge">证据段 ${idx + 1}</span></header>${audioPanel(item.audio, '真题证据段')}<div class="field"><label>不看文本，写下听到的关键词或句子</label><textarea id="replay-heard" placeholder="先记录听到的内容，不要求拼写完全正确">${escapeHtml(r.heard || '')}</textarea></div><div class="field"><label>主要障碍</label><div class="choice-row">${choice(`barrier-${item.id}`, 'U', '不认识', r.barrier === 'U')}${choice(`barrier-${item.id}`, 'S', '认识但没听出', r.barrier === 'S')}${choice(`barrier-${item.id}`, 'C', '组合失败', r.barrier === 'C')}${choice(`barrier-${item.id}`, 'M', '已听清', r.barrier === 'M')}</div></div>${r.revealed ? `<div class="transcript">${escapeHtml(item.text)}</div><label class="exam-option"><input type="checkbox" id="collect-evidence" ${collected ? 'checked' : ''}>收藏此证据句，加入复习队列</label>${recordingBlock('evidence', item.id, '录制证据句复述')}<button class="primary-btn" id="finish-evidence">完成本段</button>` : `<button class="primary-btn" id="reveal-evidence" ${plays < 2 ? 'disabled' : ''}>${plays < 2 ? `还需播放 ${2 - plays} 遍` : '显示原文并复述'}</button>`}</div>`;
  screen.innerHTML = paper('重听模式 · 证据定位', '考题对应句与必要上下文逐段处理。', `<div class="paper-body">${body}</div>`, '模式 2/3');
  attachAudioTracking();
  document.getElementById('replay-heard').addEventListener('input', ev => { state.replay.items[item.id] = { ...(state.replay.items[item.id] || {}), heard: ev.target.value }; saveState(); });
  document.querySelectorAll(`input[name="barrier-${item.id}"]`).forEach(x => x.addEventListener('change', ev => { state.replay.items[item.id] = { ...(state.replay.items[item.id] || {}), barrier: ev.target.value }; saveState(); }));
  document.getElementById('replay-prev').addEventListener('click', () => { state.replay.current = idx - 1; saveState(); renderReplay(); });
  if (document.getElementById('replay-next')) document.getElementById('replay-next').addEventListener('click', () => { state.replay.current = idx + 1; saveState(); renderReplay(); });
  if (document.getElementById('reveal-evidence')) document.getElementById('reveal-evidence').addEventListener('click', () => { const current = state.replay.items[item.id] || {}; const currentPlays = state.plays[playId] || 0; if (currentPlays < 2) return toast('请先完成两遍重听'); if (!current.heard?.trim() || !current.barrier) return toast('请先记录听到的内容并选择障碍'); state.replay.items[item.id] = { ...current, revealed: true }; saveState(); renderReplay(); });
  if (document.getElementById('collect-evidence')) document.getElementById('collect-evidence').addEventListener('change', ev => { state.replay.items[item.id] = { ...(state.replay.items[item.id] || {}), collected: ev.target.checked }; saveState(); });
  if (document.getElementById('finish-evidence')) document.getElementById('finish-evidence').addEventListener('click', async () => { const keys = await listRecordingKeys(); if (!keys.includes(`${RECORD_PREFIX}evidence-${item.id}`)) return toast('请先录制证据句复述'); state.replay.items[item.id] = { ...(state.replay.items[item.id] || {}), finished: true }; if (idx < C.evidence.length - 1) state.replay.current = idx + 1; else state.completed.replay = true; saveState(); idx < C.evidence.length - 1 ? renderReplay() : navigate('vocab'); });
}

function renderVocab() {
  const idx = Math.max(0, Math.min(state.vocab.current, C.vocab.length - 1));
  const item = C.vocab[idx];
  const v = state.vocab.items[item.id] || {};
  const done = C.vocab.filter(x => state.vocab.items[x.id]?.status).length;
  const highlighted = C.highlightedTranscript.reduce((html, part, i) => html + (i % 2 ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)), '');
  const body = `${modeStrip('vocab')}<div class="instruction"><strong>一次只学一个词。</strong><span>先点“读音”，再选择真实状态；选择后才显示中文词义和原文语境。</span></div><div class="focus-pager"><button class="small-btn" id="vocab-prev" ${idx === 0 ? 'disabled' : ''}>← 上一个</button><div><strong>${idx + 1} / ${C.vocab.length}</strong><span>已分类 ${done}/${C.vocab.length}</span></div><button class="small-btn" id="vocab-next" ${idx === C.vocab.length - 1 || !v.status ? 'disabled' : ''}>下一个 →</button></div><div class="vocab-focus"><div class="vocab-card vocab-card-focus"><div class="word-type">${escapeHtml(item.type)}</div><h3>${escapeHtml(item.word)}</h3><div class="control-row"><button class="small-btn" id="speak-word">🔊 读音</button></div>${v.status ? `<div class="meaning-box"><div><span>中文词义</span><strong>${escapeHtml(item.meaning)}</strong></div><div><span>原文语境</span><p>${escapeHtml(item.context)}</p></div></div>` : `<p class="vocab-hidden-hint">词义暂时隐藏。听读音后选择状态。</p>`}<div class="choice-row">${choice(`vocab-${item.id}`, 'U', 'U 不认识', v.status === 'U')}${choice(`vocab-${item.id}`, 'S', 'S 没听出', v.status === 'S')}${choice(`vocab-${item.id}`, 'C', 'C 组合失败', v.status === 'C')}${choice(`vocab-${item.id}`, 'M', '已掌握', v.status === 'M')}</div>${v.status ? `<label class="exam-option"><input type="checkbox" id="collect-word" ${v.collected ? 'checked' : ''}>收藏该词，加入复习队列</label>` : ''}</div></div><details style="margin-top:24px" ${done === C.vocab.length ? 'open' : ''}><summary>查看完整重点标记文本</summary><div class="transcript highlight-text">${highlighted}</div></details><div class="control-row" style="margin-top:18px"><button class="primary-btn" id="finish-vocab" ${done !== C.vocab.length ? 'disabled' : ''}>完成词汇教学并进入复述</button></div>`;
  screen.innerHTML = paper('文本分析 · 词汇教学', '基础词与学术词共同处理，逐个显示词义。', `<div class="paper-body">${body}</div>`, '模式 3/3');
  document.getElementById('speak-word').addEventListener('click', () => speak(item.word));
  document.querySelectorAll(`input[name="vocab-${item.id}"]`).forEach(x => x.addEventListener('change', ev => { state.vocab.items[item.id] = { ...(state.vocab.items[item.id] || {}), status: ev.target.value, collected: ev.target.value !== 'M' }; saveState(); renderVocab(); }));
  if (document.getElementById('collect-word')) document.getElementById('collect-word').addEventListener('change', ev => { state.vocab.items[item.id] = { ...v, collected: ev.target.checked }; saveState(); });
  document.getElementById('vocab-prev').addEventListener('click', () => { state.vocab.current = idx - 1; saveState(); renderVocab(); });
  document.getElementById('vocab-next').addEventListener('click', () => { state.vocab.current = idx + 1; saveState(); renderVocab(); });
  document.getElementById('finish-vocab').addEventListener('click', () => { state.completed.vocab = true; saveState(); navigate('repeat'); });
}

function speak(text) {
  if (!window.speechSynthesis) return toast('当前浏览器不支持语音朗读');
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.82; speechSynthesis.speak(u);
}

function recordingBlock(scope, slot, label) {
  const key = `${RECORD_PREFIX}${scope}-${slot}`;
  return `<div class="recorder"><div class="control-row"><button class="secondary-btn record-btn" data-record="${escapeHtml(key)}">● ${escapeHtml(label)}</button><span class="timer" data-record-timer="${escapeHtml(key)}">00:00</span></div><div class="recordings" data-record-preview="${escapeHtml(key)}"><span class="status-dot">尚无录音</span></div></div>`;
}

function renderRepeat() {
  const idx = Math.max(0, Math.min(state.repeat.current, C.repeat.length - 1));
  const item = C.repeat[idx];
  const r = state.repeat.items[item.id] || {};
  const body = `<div class="instruction"><strong>先听后复述。</strong><span>第一遍不看文本直接复述；需要时再查看关键词，第二轮覆盖录音。</span></div><div class="focus-pager"><button class="small-btn" id="repeat-prev" ${idx === 0 ? 'disabled' : ''}>← 上一句</button><div><strong>${idx + 1} / ${C.repeat.length}</strong><span>证据句复述</span></div><button class="small-btn" id="repeat-next" ${idx === C.repeat.length - 1 || r.score === undefined ? 'disabled' : ''}>下一句 →</button></div><div class="question-card">${audioPanel(item.audio, '原句')}${recordingBlock('repeat', item.id, '录制复述')}<details><summary>录音后查看关键词与原句</summary><div class="transcript">${escapeHtml(item.prompt)}</div><div class="transcript">${escapeHtml(item.text)}</div></details><div class="field" style="margin-top:14px"><span class="field-label">独立完成评分</span><div class="choice-row">${choice(`repeat-score-${item.id}`, '0', '0 无法完成', r.score === 0)}${choice(`repeat-score-${item.id}`, '1', '1 主要信息有缺失', r.score === 1)}${choice(`repeat-score-${item.id}`, '2', '2 信息完整清晰', r.score === 2)}</div></div></div><button class="primary-btn" id="finish-repeat" ${C.repeat.every(x => state.repeat.items[x.id]?.score !== undefined) ? '' : 'disabled'}>完成复述并进入口语</button>`;
  screen.innerHTML = paper('证据句复述', '把“听得懂”推进到“能够说出来”。', `<div class="paper-body">${body}</div>`, `${idx + 1}/${C.repeat.length}`);
  attachAudioTracking();
  document.querySelectorAll(`input[name="repeat-score-${item.id}"]`).forEach(x => x.addEventListener('change', ev => { state.repeat.items[item.id] = { ...r, score: Number(ev.target.value) }; saveState(); renderRepeat(); }));
  document.getElementById('repeat-prev').addEventListener('click', () => { state.repeat.current = idx - 1; saveState(); renderRepeat(); });
  if (document.getElementById('repeat-next')) document.getElementById('repeat-next').addEventListener('click', () => { state.repeat.current = idx + 1; saveState(); renderRepeat(); });
  document.getElementById('finish-repeat').addEventListener('click', () => { state.completed.repeat = true; saveState(); navigate('interview'); });
}

function renderInterview() {
  const idx = Math.max(0, Math.min(state.interview.current, C.interview.length - 1));
  const item = C.interview[idx];
  const r = state.interview.items[item.id] || {};
  const body = `<div class="instruction"><strong>两轮表达：</strong><span>第一轮不计时但控制在90秒内；整理思路和3个可复用词块后，第二轮按45秒完成。</span></div><div class="focus-pager"><button class="small-btn" id="interview-prev" ${idx === 0 ? 'disabled' : ''}>← 上一题</button><div><strong>${idx + 1} / ${C.interview.length}</strong><span>${escapeHtml(C.speakingTitle)}</span></div><button class="small-btn" id="interview-next" ${idx === C.interview.length - 1 || !r.done ? 'disabled' : ''}>下一题 →</button></div><div class="question-card"><header><h3>${escapeHtml(item.id)}</h3><span class="badge">${escapeHtml(item.structure)}</span></header><div class="question-text">${escapeHtml(item.question)}</div><button class="small-btn" id="speak-question">🔊 播放题目</button><div class="field" style="margin-top:14px"><label>第一轮前：关键词计划</label><textarea id="interview-plan" placeholder="立场 / 理由 / 例子">${escapeHtml(r.plan || '')}</textarea></div>${recordingBlock('interview', `${item.id}-first`, '第一轮自由表达')}<div class="two-grid"><div class="field"><label>整理后的思路地图</label><textarea id="interview-map" placeholder="只写关键词，不写完整稿">${escapeHtml(r.map || '')}</textarea></div><div class="field"><label>3个可复用词块</label><textarea id="interview-chunks" placeholder="chunk 1 / chunk 2 / chunk 3">${escapeHtml(r.chunks || '')}</textarea></div></div><div class="control-row"><button class="small-btn" id="prep-timer">开始30秒准备</button><span class="timer" id="prep-display">00:30</span></div>${recordingBlock('interview', `${item.id}-second`, '第二轮45秒表达')}<button class="primary-btn" id="finish-interview-item">完成本题</button></div><button class="primary-btn" id="finish-interview" ${C.interview.every(x => state.interview.items[x.id]?.done) ? '' : 'disabled'}>完成Interview并进入迁移</button>`;
  screen.innerHTML = paper(C.speakingTitle, '建立可迁移的思路和语料，不背完整答案。', `<div class="paper-body">${body}</div>`, `Q${idx + 1}`);
  document.getElementById('speak-question').addEventListener('click', () => speak(item.question));
  ['plan', 'map', 'chunks'].forEach(k => document.getElementById(`interview-${k}`).addEventListener('input', ev => { state.interview.items[item.id] = { ...(state.interview.items[item.id] || {}), [k]: ev.target.value }; saveState(); }));
  document.getElementById('prep-timer').addEventListener('click', () => startCountdown(30, document.getElementById('prep-display')));
  document.getElementById('interview-prev').addEventListener('click', () => { state.interview.current = idx - 1; saveState(); renderInterview(); });
  if (document.getElementById('interview-next')) document.getElementById('interview-next').addEventListener('click', () => { state.interview.current = idx + 1; saveState(); renderInterview(); });
  document.getElementById('finish-interview-item').addEventListener('click', async () => { const current = state.interview.items[item.id] || {}; const keys = await listRecordingKeys(); if (!current.plan?.trim() || !current.map?.trim() || !current.chunks?.trim()) return toast('请完成计划、思路地图和可复用词块'); if (!keys.includes(`${RECORD_PREFIX}interview-${item.id}-first`) || !keys.includes(`${RECORD_PREFIX}interview-${item.id}-second`)) return toast('请完成两轮录音'); state.interview.items[item.id] = { ...current, done: true }; if (idx < C.interview.length - 1) state.interview.current = idx + 1; saveState(); idx < C.interview.length - 1 ? renderInterview() : renderInterview(); });
  document.getElementById('finish-interview').addEventListener('click', () => { state.completed.interview = true; saveState(); navigate('transfer'); });
}

function renderTransfer() {
  const t = state.transfer;
  const body = `<div class="instruction"><strong>迁移题：</strong><span>换一个表面话题，但复用本课的论证结构与至少两个新词块。</span></div><div class="question-card"><div class="question-text">${escapeHtml(C.transferQuestion)}</div><div class="field"><label>30秒关键词计划</label><textarea id="transfer-plan">${escapeHtml(t.plan)}</textarea></div><div class="control-row"><button class="small-btn" id="transfer-timer">开始30秒准备</button><span class="timer" id="transfer-display">00:30</span></div>${recordingBlock('transfer', 'final', '录制45秒迁移回答')}</div><div class="two-grid"><div class="field"><label>本课最需要复查的5个词/词块</label><textarea id="review-words">${escapeHtml(t.reviewWords)}</textarea></div><div class="field"><label>今天比冷启动更清楚的内容</label><textarea id="reflection">${escapeHtml(t.reflection)}</textarea></div></div><button class="primary-btn" id="complete-transfer">完成 ${escapeHtml(C.lessonLabel)}</button>`;
  screen.innerHTML = paper('迁移与退出检测', '课堂记录会自动形成下一次复习队列。', `<div class="paper-body">${body}</div>`, '最后一步');
  document.getElementById('transfer-plan').addEventListener('input', ev => { t.plan = ev.target.value; saveState(); });
  document.getElementById('review-words').addEventListener('input', ev => { t.reviewWords = ev.target.value; saveState(); });
  document.getElementById('reflection').addEventListener('input', ev => { t.reflection = ev.target.value; saveState(); });
  document.getElementById('transfer-timer').addEventListener('click', () => startCountdown(30, document.getElementById('transfer-display')));
  document.getElementById('complete-transfer').addEventListener('click', async () => { const keys = await listRecordingKeys(); if (!t.plan.trim() || !t.reviewWords.trim() || !t.reflection.trim() || !keys.includes(`${RECORD_PREFIX}transfer-final`)) return toast('请完成迁移录音和退出记录'); state.completed.transfer = true; logEvent('lesson_completed'); saveState(`${C.lessonLabel} 已完成`); appMode = 'teacher'; document.getElementById('mode-toggle').textContent = '返回学生端'; navigate('dashboard'); });
}

function renderDashboard() {
  if (appMode !== 'teacher') { navigate('home'); return; }
  const review = C.vocab.filter(x => { const v = state.vocab.items[x.id]; return v?.collected || (v?.status && v.status !== 'M'); });
  const repeatScores = C.repeat.map(x => state.repeat.items[x.id]?.score).filter(x => x !== undefined);
  const firstCorrect = C.examQuestions.filter((q, i) => Number(state.exam.answers[i]) === q.answer).length;
  const revisedCorrect = C.examQuestions.filter((q, i) => Number(state.exam.revision[i] ?? state.exam.answers[i]) === q.answer).length;
  const body = `<div class="metric-grid"><div class="metric-card"><span>冷启动正确</span><strong>${firstCorrect}/${C.examQuestions.length}</strong></div><div class="metric-card"><span>重做后正确</span><strong>${revisedCorrect}/${C.examQuestions.length}</strong></div><div class="metric-card"><span>词汇复查队列</span><strong>${review.length}</strong></div><div class="metric-card"><span>复述平均分</span><strong>${repeatScores.length ? (repeatScores.reduce((a, b) => a + b, 0) / repeatScores.length).toFixed(1) : '—'}</strong></div></div><h3 style="color:var(--navy);margin-top:28px">词汇复查队列</h3>${review.length ? `<table class="dashboard-table"><thead><tr><th>词 / 词块</th><th>词义</th><th>状态</th></tr></thead><tbody>${review.map(x => `<tr><td>${escapeHtml(x.word)}</td><td>${escapeHtml(x.meaning)}</td><td>${escapeHtml(state.vocab.items[x.id]?.status || '收藏')}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">尚未形成复查队列</div>'}<h3 style="color:var(--navy);margin-top:28px">收藏的证据句</h3>${C.evidence.filter(x => state.replay.items[x.id]?.collected).map(x => `<div class="transcript">${escapeHtml(x.text)}</div>`).join('') || '<div class="empty">尚未收藏证据句</div>'}<h3 style="color:var(--navy);margin-top:28px">录音记录</h3><div id="teacher-recordings" class="recordings"><div class="empty">正在读取…</div></div><h3 style="color:var(--navy);margin-top:28px">教师课堂备注</h3><textarea class="teacher-note" id="teacher-summary">${escapeHtml(state.teacherNotes.summary || '')}</textarea><div class="control-row" style="margin-top:15px"><button class="primary-btn" id="save-teacher-note">保存备注</button><button class="secondary-btn" id="dashboard-export">导出JSON记录</button><button class="danger-btn" id="reset-all">清空本课数据</button></div>`;
  screen.innerHTML = paper('教师数据面板', '仅显示 Zhcw 本课数据；录音默认保存在当前浏览器。', `<div class="paper-body">${body}</div>`, 'Teacher');
  populateDashboardRecordings();
  document.getElementById('save-teacher-note').addEventListener('click', () => { state.teacherNotes.summary = document.getElementById('teacher-summary').value; saveState('教师备注已保存'); });
  document.getElementById('dashboard-export').addEventListener('click', exportState);
  document.getElementById('reset-all').addEventListener('click', resetAll);
}

function startCountdown(seconds, el) {
  clearInterval(activeTimer); let left = seconds; el.textContent = `00:${String(left).padStart(2, '0')}`;
  activeTimer = setInterval(() => { left--; el.textContent = `00:${String(Math.max(0, left)).padStart(2, '0')}`; if (left <= 0) { clearInterval(activeTimer); toast('准备时间结束'); } }, 1000);
}

function exportState() {
  const payload = { student: 'Zhcw', lesson: `${C.lessonLabel} · ${C.title}`, exportedAt: new Date().toISOString(), state };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `Zhcw_${C.lessonLabel.replace(' ', '')}_${new Date().toISOString().slice(0, 10)}.json`);
  toast('学习记录已导出');
}

async function resetAll() {
  if (!confirm(`确定清空 ${C.lessonLabel} 的文字记录和全部录音吗？此操作无法撤销。`)) return;
  localStorage.removeItem(STORAGE_KEY);
  await clearLessonRecordings();
  state = defaultState(); appMode = 'student'; render(); toast('本课数据已清空');
}

function downloadBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }

function openDB() { return new Promise((resolve, reject) => { const req = indexedDB.open(DB_NAME, 1); req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('recordings')) req.result.createObjectStore('recordings'); }; req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); }
async function putRecording(key, blob) { const db = await openDB(); return new Promise((resolve, reject) => { const tx = db.transaction('recordings', 'readwrite'); tx.objectStore('recordings').put({ blob, updatedAt: new Date().toISOString() }, key); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); }
async function getRecording(key) { const db = await openDB(); return new Promise((resolve, reject) => { const req = db.transaction('recordings').objectStore('recordings').get(key); req.onsuccess = () => resolve(req.result || null); req.onerror = () => reject(req.error); }); }
async function listRecordingKeys() { const db = await openDB(); return new Promise((resolve, reject) => { const req = db.transaction('recordings').objectStore('recordings').getAllKeys(); req.onsuccess = () => resolve(req.result.map(String).filter(x => x.startsWith(RECORD_PREFIX))); req.onerror = () => reject(req.error); }); }
async function clearLessonRecordings() { const keys = await listRecordingKeys(); const db = await openDB(); return new Promise((resolve, reject) => { const tx = db.transaction('recordings', 'readwrite'); keys.forEach(k => tx.objectStore('recordings').delete(k)); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); }

function bindRecordButtons() { document.querySelectorAll('[data-record]').forEach(btn => btn.addEventListener('click', () => toggleRecording(btn.dataset.record, btn))); }
async function toggleRecording(key, btn) {
  if (activeRecorder) { if (activeRecorder.key !== key) return toast('请先结束当前录音'); activeRecorder.recorder.stop(); return; }
  if (!navigator.mediaDevices?.getUserMedia) return toast('当前浏览器不支持录音');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const chunks = []; const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = async () => { clearInterval(activeRecorder?.interval); stream.getTracks().forEach(t => t.stop()); const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }); await putRecording(key, blob); activeRecorder = null; logEvent('recording_saved', { key, size: blob.size }); saveState('录音已保存'); render(); };
    recorder.start(); let sec = 0; btn.classList.add('recording'); btn.textContent = '■ 停止并保存'; const timer = document.querySelector(`[data-record-timer="${CSS.escape(key)}"]`); const interval = setInterval(() => { sec++; if (timer) timer.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; }, 1000); activeRecorder = { key, recorder, interval };
  } catch { toast('无法使用麦克风，请检查浏览器权限'); }
}

async function loadRecordingPreviews() {
  for (const el of document.querySelectorAll('[data-record-preview]')) { const key = el.dataset.recordPreview; const data = await getRecording(key); if (!data) continue; const url = URL.createObjectURL(data.blob); el.innerHTML = `<div class="recording-row"><span class="status-dot done">已保存</span><audio controls src="${url}"></audio><button class="small-btn">下载</button></div>`; el.querySelector('button').addEventListener('click', () => downloadBlob(data.blob, `${key.replace(':', '-')}.webm`)); }
}

async function populateDashboardRecordings() {
  const keys = await listRecordingKeys(); const box = document.getElementById('teacher-recordings'); if (!box) return;
  if (!keys.length) { box.innerHTML = '<div class="empty">暂无录音</div>'; return; }
  box.innerHTML = '';
  for (const key of keys) { const data = await getRecording(key); const url = URL.createObjectURL(data.blob); const row = document.createElement('div'); row.className = 'recording-row'; row.innerHTML = `<strong>${escapeHtml(key.replace(RECORD_PREFIX, ''))}</strong><audio controls src="${url}"></audio><button class="small-btn">下载</button>`; row.querySelector('button').addEventListener('click', () => downloadBlob(data.blob, `${key.replace(':', '-')}.webm`)); box.appendChild(row); }
}

document.getElementById('mode-toggle').addEventListener('click', () => { appMode = appMode === 'student' ? 'teacher' : 'student'; document.getElementById('mode-toggle').textContent = appMode === 'student' ? '切换教师端' : '返回学生端'; if (appMode === 'teacher') state.activeScreen = 'dashboard'; else if (state.activeScreen === 'dashboard') state.activeScreen = 'home'; render(); });
document.getElementById('export-btn').addEventListener('click', exportState);
document.getElementById('mobile-menu').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));

render();
