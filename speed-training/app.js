const DATA = window.SPEED_DATA || [];
const STORAGE_KEY = 'zhcw_dual_speed_v1';
const DB_NAME = 'zhcw-dual-speed-recordings';
const RECORD_PREFIX = 'zhcw-dual-speed:';

let currentView = 'home';
let activeRecorder = null;
let readingTimer = null;
let state = loadState();

function emptyLesson(lesson) {
  return {
    clips: Object.fromEntries(lesson.clips.map(clip => [clip.id, {
      plays: 0, keyword: null, relation: null, confidence: '', responseMs: null,
      submitted: false, endedAt: null
    }])),
    reading: {
      startedAt: null, elapsed: 0, completed: false, reviewOpen: false,
      questions: lesson.questions.map(() => ({ revealed: false, score: null }))
    },
    completed: false,
    completedAt: null
  };
}

function defaultState() {
  return {
    version: 1,
    student: 'Zhcw',
    startedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    lessons: Object.fromEntries(DATA.map(lesson => [lesson.id, emptyLesson(lesson)]))
  };
}

function loadState() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { saved = null; }
  const base = defaultState();
  if (!saved?.lessons) return base;
  DATA.forEach(lesson => {
    const old = saved.lessons[lesson.id];
    if (!old) return;
    base.lessons[lesson.id] = {
      ...base.lessons[lesson.id], ...old,
      clips: { ...base.lessons[lesson.id].clips, ...(old.clips || {}) },
      reading: {
        ...base.lessons[lesson.id].reading, ...(old.reading || {}),
        questions: lesson.questions.map((_, index) => ({
          ...base.lessons[lesson.id].reading.questions[index],
          ...(old.reading?.questions?.[index] || {})
        }))
      }
    };
  });
  base.startedAt = saved.startedAt || base.startedAt;
  base.lastActiveAt = saved.lastActiveAt || base.lastActiveAt;
  return base;
}

function saveState(message = '') {
  state.lastActiveAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (message) toast(message);
  renderNav();
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function formatTime(seconds) {
  const value = Math.max(0, Math.round(seconds || 0));
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function renderNav() {
  const nav = document.getElementById('lesson-nav');
  nav.innerHTML = `<button class="nav-btn ${currentView === 'home' ? 'active' : ''}" data-view="home"><span class="nav-code">⌂</span><span class="nav-title">训练总览</span></button>` +
    DATA.map(lesson => `<button class="nav-btn ${currentView === lesson.id ? 'active' : ''}" data-view="${lesson.id}"><span class="nav-code">${lesson.id}</span><span class="nav-title">${escapeHtml(lesson.titleCn)}</span><i class="nav-dot ${state.lessons[lesson.id].completed ? 'done' : ''}"></i></button>`).join('');
  nav.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.view)));
}

function navigate(view) {
  stopReadingTimer();
  currentView = view;
  render();
  document.querySelector('.sidebar').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function lessonProgress(lesson) {
  const record = state.lessons[lesson.id];
  const clipDone = lesson.clips.filter(clip => record.clips[clip.id].submitted).length;
  const questionDone = record.reading.questions.filter(question => question.score !== null).length;
  const total = lesson.clips.length + lesson.questions.length + 1;
  const done = clipDone + questionDone + (record.reading.completed ? 1 : 0);
  return Math.round(done / total * 100);
}

function renderHome() {
  const completed = DATA.filter(lesson => state.lessons[lesson.id].completed).length;
  const allClips = DATA.flatMap(lesson => lesson.clips.map(clip => state.lessons[lesson.id].clips[clip.id]));
  const submitted = allClips.filter(clip => clip.submitted);
  const audioPoints = submitted.reduce((sum, clip) => sum + Number(clip.keyword || 0) + Number(clip.relation || 0), 0);
  const audioMax = submitted.length * 3;
  document.getElementById('view').innerHTML = `<div class="page">
    <section class="hero">
      <span class="eyebrow">ZHCHW · DUAL-SPEED LAB</span>
      <h1>把“听见”和“看懂”分开测</h1>
      <p class="lead">使用8篇未练过的真题讲座，分别记录声音进入后形成词组的速度，以及文字进入后形成主旨和逻辑的速度。第一遍数据保留，第二遍用于教学。</p>
      <div class="hero-metrics">
        <div class="metric"><strong>${completed}/8</strong><span>已完成讲座</span></div>
        <div class="metric"><strong>${submitted.length}/24</strong><span>已完成听辨片段</span></div>
        <div class="metric"><strong>${audioMax ? `${Math.round(audioPoints / audioMax * 100)}%` : '—'}</strong><span>当前听辨准确率</span></div>
      </div>
    </section>
    <section class="overview-grid">${DATA.map(lesson => {
      const progress = lessonProgress(lesson);
      return `<article class="lecture-card"><div class="card-top"><span class="code-pill">${lesson.id}</span><span class="tag">${progress}%</span></div><h3>${escapeHtml(lesson.titleCn)}</h3><p>${escapeHtml(lesson.titleEn)}<br>${escapeHtml(lesson.source)}</p><div class="progress-track"><i style="width:${progress}%"></i></div><button class="card-btn" data-open="${lesson.id}">${progress ? '继续训练' : '开始训练'}</button></article>`;
    }).join('')}</section>
  </div>`;
  document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.open)));
}

function scoreButtons(kind, value, values, clipId) {
  return `<div class="button-group">${values.map(item => `<button class="choice-btn ${String(value) === String(item.value) ? 'selected' : ''}" data-clip-score="${clipId}" data-kind="${kind}" data-value="${item.value}">${item.label}</button>`).join('')}</div>`;
}

function recordingBlock(key, label) {
  return `<div class="recorder" data-recording-key="${escapeHtml(key)}"><button class="record-btn" data-record="${escapeHtml(key)}">● ${escapeHtml(label)}</button><span class="record-status" data-record-status="${escapeHtml(key)}">尚未录音</span><audio class="record-playback" data-record-playback="${escapeHtml(key)}" controls hidden></audio></div>`;
}

function renderClip(lesson, clip) {
  const record = state.lessons[lesson.id].clips[clip.id];
  const reaction = record.responseMs === null ? '尚未记录' : `${(record.responseMs / 1000).toFixed(1)}秒`;
  return `<article class="clip-card" id="${clip.id}">
    <div class="clip-head"><div><h3>${clip.id}</h3><span class="focus">${escapeHtml(clip.focus)}</span></div><span class="tag">播放 ${record.plays} 次</span></div>
    <div class="audio-row"><audio controls preload="metadata" data-source-audio="${clip.id}" src="${encodeURI(clip.audio)}"></audio><span class="play-count">第一遍后立即开口</span></div>
    ${recordingBlock(`${RECORD_PREFIX}${clip.id}`, '开始口述/复述')}
    <div class="score-panel">
      <div class="field"><label>核心词信息（0–2分）</label>${scoreButtons('keyword', record.keyword, [{value:0,label:'0'}, {value:1,label:'1'}, {value:2,label:'2'}], clip.id)}</div>
      <div class="field"><label>关系与结构（0–1分）</label>${scoreButtons('relation', record.relation, [{value:0,label:'0'}, {value:1,label:'1'}], clip.id)}</div>
      <div class="field"><label>第一遍信心</label>${scoreButtons('confidence', record.confidence, [{value:'low',label:'低'}, {value:'mid',label:'中'}, {value:'high',label:'高'}], clip.id)}</div>
      <div class="field"><label>开口反应</label><div class="tag">${reaction}</div></div>
      <div class="reveal">
        ${record.submitted ? `<strong>原句与得分点</strong><p>${escapeHtml(clip.target)}</p><p><b>关键词：</b>${escapeHtml(clip.keys)}</p>` : `<strong>先完成第一遍，再核对原句</strong><p>至少播放1次、完成口述并选择词汇分和关系分后，才能显示文本。</p><button class="primary" data-submit-clip="${clip.id}">完成第一遍并显示原句</button>`}
      </div>
    </div>
  </article>`;
}

function renderReading(lesson) {
  const record = state.lessons[lesson.id].reading;
  if (!record.startedAt && !record.completed) {
    return `<div class="reading-gate"><h3>限时阅读尚未开始</h3><p>${lesson.wordCount}词，建议上限 ${formatTime(lesson.readingLimit)}。开始后显示英文原文；读完后文本会隐藏，再口头回答3题。</p><button class="primary" data-start-reading="${lesson.id}">开始限时阅读</button></div>`;
  }
  if (record.startedAt && !record.completed) {
    return `<div class="reading-toolbar"><div><strong>正在限时阅读</strong><div class="timer" id="reading-timer">${formatTime(lesson.readingLimit - readingElapsed(record))}</div></div><button class="primary" data-finish-reading="${lesson.id}">我已读完，隐藏文本</button></div><div class="transcript">${escapeHtml(lesson.transcript)}</div>`;
  }
  const questions = lesson.questions.map((item, index) => {
    const q = record.questions[index];
    return `<div class="question"><p>${index + 1}. ${escapeHtml(item.question)}</p>${q.revealed ? `<div class="answer-box"><b>参考要点：</b>${escapeHtml(item.answer)}</div><div class="self-score"><button class="choice-btn ${q.score === 0 ? 'selected' : ''}" data-question-score="${index}" data-value="0">关系未答对 0分</button><button class="choice-btn ${q.score === 1 ? 'selected' : ''}" data-question-score="${index}" data-value="1">关系答对 1分</button></div>` : `<button class="secondary choice-btn" data-reveal-question="${index}">口头回答后显示参考要点</button>`}</div>`;
  }).join('');
  return `<div class="reading-gate"><h3>第一遍阅读已结束</h3><p>实际用时 ${formatTime(record.elapsed)}。不要立即重看原文，先口头回答下面3题。</p></div>${recordingBlock(`${RECORD_PREFIX}${lesson.id}-reading`, '录制3题口头回答')}<div class="question-list">${questions}</div><button class="choice-btn" data-toggle-review="${lesson.id}">${record.reviewOpen ? '关闭复盘文本' : '教学复盘：重新显示文本'}</button>${record.reviewOpen ? `<div class="transcript">${escapeHtml(lesson.transcript)}</div>` : ''}`;
}

function renderLesson(lesson) {
  const record = state.lessons[lesson.id];
  document.getElementById('view').innerHTML = `<div class="page">
    <div class="lesson-head"><div><span class="eyebrow">${lesson.id} · DUAL-SPEED</span><h1>${escapeHtml(lesson.titleCn)}</h1><p class="source">${escapeHtml(lesson.titleEn)} · ${escapeHtml(lesson.source)} · 原音位置 ${escapeHtml(lesson.sourceTime)}</p></div><span class="tag">进度 ${lessonProgress(lesson)}%</span></div>
    <section class="section-card"><div class="section-title"><div><h2>A｜音频辨别速度</h2><p>每个片段第一遍不看文本；音频结束后立即开口复述英文或用中文准确释义。</p></div><span class="tag">每题3分</span></div><ol class="instructions"><li>只播放1次并立即开始口述录音。</li><li>先自评“核心词”和“关系”，再显示原句。</li><li>第二遍开始用于教学，不覆盖第一遍记录。</li></ol><div class="clip-grid">${lesson.clips.map(clip => renderClip(lesson, clip)).join('')}</div></section>
    <section class="section-card"><div class="section-title"><div><h2>B｜文本理解速度</h2><p>限时阅读后隐藏文本，用口头回答检查主旨、逻辑和细节。</p></div><span class="tag">${lesson.wordCount}词 / ${formatTime(lesson.readingLimit)}</span></div>${renderReading(lesson)}</section>
    <section class="section-card"><div class="section-title"><div><h2>完整讲座复盘</h2><p>完成两项首测后，再用完整音频复核篇章结构。此处播放不计入24个听辨片段。</p></div><span class="tag" id="full-audio-status">正在加载完整音频</span></div><audio controls preload="metadata" data-full-audio="${lesson.id}"></audio></section>
    <div class="completion-bar"><div><strong>${record.completed ? '本篇训练已完成' : '完成条件'}</strong><p>3个听辨片段已评分，限时阅读结束，3道理解题已自评。</p></div><button class="primary" data-complete-lesson="${lesson.id}">${record.completed ? '重新核对完成状态' : '完成本篇'}</button></div>
  </div>`;
  bindLessonEvents(lesson);
  loadRecordingPreviews();
  loadFullAudio(lesson);
  if (record.reading.startedAt && !record.reading.completed) startReadingTimer(lesson);
}

async function loadFullAudio(lesson) {
  const audio = document.querySelector(`[data-full-audio="${lesson.id}"]`);
  const status = document.getElementById('full-audio-status');
  if (!audio) return;
  try {
    const paths = ['00', '01', '02', '03'].map(part => `assets/audio/full-parts/${lesson.id}-${part}.bin`);
    const responses = await Promise.all(paths.map(path => fetch(path)));
    if (responses.some(response => !response.ok)) throw new Error('audio part missing');
    const buffers = await Promise.all(responses.map(response => response.arrayBuffer()));
    audio.src = URL.createObjectURL(new Blob(buffers, { type: 'audio/mpeg' }));
    if (status) status.textContent = '完整音频已就绪';
  } catch {
    if (status) status.textContent = '完整音频加载失败，请刷新';
  }
}

function bindLessonEvents(lesson) {
  document.querySelectorAll('[data-source-audio]').forEach(audio => {
    audio.addEventListener('play', () => {
      if (audio.currentTime > .35) return;
      const clip = state.lessons[lesson.id].clips[audio.dataset.sourceAudio];
      clip.plays += 1;
      saveState();
      const badge = audio.closest('.clip-card').querySelector('.tag');
      badge.textContent = `播放 ${clip.plays} 次`;
    });
    audio.addEventListener('ended', () => {
      const clip = state.lessons[lesson.id].clips[audio.dataset.sourceAudio];
      clip.endedAt = Date.now();
      saveState();
    });
  });
  document.querySelectorAll('[data-clip-score]').forEach(button => button.addEventListener('click', () => {
    const clip = state.lessons[lesson.id].clips[button.dataset.clipScore];
    const kind = button.dataset.kind;
    clip[kind] = kind === 'confidence' ? button.dataset.value : Number(button.dataset.value);
    saveState(); renderLesson(lesson);
  }));
  document.querySelectorAll('[data-submit-clip]').forEach(button => button.addEventListener('click', async () => {
    const clip = state.lessons[lesson.id].clips[button.dataset.submitClip];
    const recording = await getRecording(`${RECORD_PREFIX}${button.dataset.submitClip}`);
    if (!clip.plays) return toast('请先播放一次音频');
    if (!recording) return toast('请先完成一次口述录音');
    if (clip.keyword === null || clip.relation === null || !clip.confidence) return toast('请完成第一遍自评');
    clip.submitted = true; saveState('第一遍数据已保留'); renderLesson(lesson);
  }));
  document.querySelector('[data-start-reading]')?.addEventListener('click', () => {
    const reading = state.lessons[lesson.id].reading;
    reading.startedAt = new Date().toISOString(); reading.elapsed = 0; saveState(); renderLesson(lesson);
  });
  document.querySelector('[data-finish-reading]')?.addEventListener('click', () => finishReading(lesson));
  document.querySelectorAll('[data-reveal-question]').forEach(button => button.addEventListener('click', () => {
    state.lessons[lesson.id].reading.questions[Number(button.dataset.revealQuestion)].revealed = true;
    saveState(); renderLesson(lesson);
  }));
  document.querySelectorAll('[data-question-score]').forEach(button => button.addEventListener('click', () => {
    state.lessons[lesson.id].reading.questions[Number(button.dataset.questionScore)].score = Number(button.dataset.value);
    saveState(); renderLesson(lesson);
  }));
  document.querySelector('[data-toggle-review]')?.addEventListener('click', () => {
    const reading = state.lessons[lesson.id].reading;
    reading.reviewOpen = !reading.reviewOpen; saveState(); renderLesson(lesson);
  });
  document.querySelector('[data-complete-lesson]')?.addEventListener('click', () => completeLesson(lesson));
  bindRecordButtons(lesson);
}

function readingElapsed(reading) {
  if (!reading.startedAt) return reading.elapsed || 0;
  return Math.max(reading.elapsed || 0, Math.round((Date.now() - Date.parse(reading.startedAt)) / 1000));
}

function startReadingTimer(lesson) {
  stopReadingTimer();
  readingTimer = setInterval(() => {
    const reading = state.lessons[lesson.id].reading;
    const elapsed = readingElapsed(reading);
    const timer = document.getElementById('reading-timer');
    if (timer) timer.textContent = formatTime(lesson.readingLimit - elapsed);
    if (elapsed >= lesson.readingLimit) finishReading(lesson, true);
  }, 500);
}

function stopReadingTimer() {
  if (readingTimer) clearInterval(readingTimer);
  readingTimer = null;
}

function finishReading(lesson, automatic = false) {
  const reading = state.lessons[lesson.id].reading;
  reading.elapsed = Math.min(readingElapsed(reading), lesson.readingLimit);
  reading.completed = true;
  reading.startedAt = null;
  stopReadingTimer();
  saveState(automatic ? '时间到，文本已隐藏' : '第一遍阅读用时已记录');
  renderLesson(lesson);
}

async function completeLesson(lesson) {
  const record = state.lessons[lesson.id];
  if (lesson.clips.some(clip => !record.clips[clip.id].submitted)) return toast('请先完成3个听辨片段');
  if (!record.reading.completed) return toast('请先完成限时阅读');
  if (record.reading.questions.some(question => question.score === null)) return toast('请为3道理解题完成自评');
  const oral = await getRecording(`${RECORD_PREFIX}${lesson.id}-reading`);
  if (!oral) return toast('请录制3道理解题的口头回答');
  record.completed = true;
  record.completedAt = new Date().toISOString();
  saveState(`${lesson.id} 已完成`);
  renderLesson(lesson);
}

function getMetrics() {
  const completedLessons = DATA.filter(lesson => state.lessons[lesson.id].completed);
  const clips = DATA.flatMap(lesson => lesson.clips.map(clip => ({ lesson, ...state.lessons[lesson.id].clips[clip.id] }))).filter(clip => clip.submitted);
  const audioPoints = clips.reduce((sum, clip) => sum + Number(clip.keyword || 0) + Number(clip.relation || 0), 0);
  const reactions = clips.map(clip => clip.responseMs).filter(value => Number.isFinite(value));
  const questionRecords = DATA.flatMap(lesson => state.lessons[lesson.id].reading.questions).filter(item => item.score !== null);
  const readingCorrect = questionRecords.reduce((sum, item) => sum + Number(item.score), 0);
  const readItems = DATA.map(lesson => ({ lesson, reading: state.lessons[lesson.id].reading })).filter(item => item.reading.completed);
  const readingRatio = readItems.length ? readItems.reduce((sum, item) => sum + item.reading.elapsed / item.lesson.readingLimit, 0) / readItems.length : null;
  return {
    completed: completedLessons.length,
    audioAccuracy: clips.length ? audioPoints / (clips.length * 3) : null,
    avgReaction: reactions.length ? reactions.reduce((a, b) => a + b, 0) / reactions.length / 1000 : null,
    textAccuracy: questionRecords.length ? readingCorrect / questionRecords.length : null,
    readingRatio
  };
}

function diagnosis(metrics) {
  if (!metrics.audioAccuracy || !metrics.textAccuracy) return '数据尚不足。至少完成1篇后，系统才会比较“声音辨别”和“文本理解”两个维度。';
  const audioHigh = metrics.audioAccuracy >= .7 && (metrics.avgReaction === null || metrics.avgReaction <= 8);
  const textHigh = metrics.textAccuracy >= .67 && (metrics.readingRatio === null || metrics.readingRatio <= 1);
  if (!audioHigh && textHigh) return '目前文字理解明显好于音频辨别，主要瓶颈更可能是“声音进入后形成稳定词组”的速度。下一步应加强学术词读音、连读弱读和短片段单遍复述。';
  if (audioHigh && !textHigh) return '目前音频辨别相对稳定，但文本主旨、逻辑或细节处理较慢。下一步应加强限时意群阅读、因果转折识别和长句拆分。';
  if (!audioHigh && !textHigh) return '听辨和文本理解两端都还不稳定，词汇与句法基础可能同时影响速度。建议先补核心学术词和句块，再做听读双通道复现。';
  return '两个维度的基础处理都较稳定，下一步重点应放在完整讲座的信息保持、结构复述和一次作答稳定性。';
}

function renderResults() {
  const metrics = getMetrics();
  document.getElementById('view').innerHTML = `<div class="page"><span class="eyebrow">LEARNING REPORT</span><h1>双速度训练结果</h1><p class="lead">只展示第一遍记录。看过文本后的重听和复盘不会覆盖首测数据。</p>
    <div class="results-grid"><div class="result-metric"><span>完成讲座</span><strong>${metrics.completed}/8</strong></div><div class="result-metric"><span>音频辨别准确率</span><strong>${metrics.audioAccuracy === null ? '—' : `${Math.round(metrics.audioAccuracy * 100)}%`}</strong></div><div class="result-metric"><span>平均开口反应</span><strong>${metrics.avgReaction === null ? '—' : `${metrics.avgReaction.toFixed(1)}s`}</strong></div><div class="result-metric"><span>文本理解正确率</span><strong>${metrics.textAccuracy === null ? '—' : `${Math.round(metrics.textAccuracy * 100)}%`}</strong></div></div>
    <div class="diagnosis"><h3>当前判断</h3>${diagnosis(metrics)}</div>
    <table class="results-table"><thead><tr><th>材料</th><th>音频听辨</th><th>阅读用时</th><th>文本理解</th><th>状态</th></tr></thead><tbody>${DATA.map(lesson => {
      const item = state.lessons[lesson.id];
      const doneClips = lesson.clips.filter(clip => item.clips[clip.id].submitted);
      const audioScore = doneClips.reduce((sum, clip) => sum + Number(item.clips[clip.id].keyword || 0) + Number(item.clips[clip.id].relation || 0), 0);
      const qDone = item.reading.questions.filter(q => q.score !== null);
      const qScore = qDone.reduce((sum, q) => sum + Number(q.score), 0);
      return `<tr><td><b>${lesson.id}</b> ${escapeHtml(lesson.titleCn)}</td><td>${doneClips.length ? `${audioScore}/${doneClips.length * 3}` : '—'}</td><td>${item.reading.completed ? formatTime(item.reading.elapsed) : '—'}</td><td>${qDone.length ? `${qScore}/${qDone.length}` : '—'}</td><td>${item.completed ? '已完成' : '进行中'}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}

function render() {
  renderNav();
  if (currentView === 'home') return renderHome();
  if (currentView === 'results') return renderResults();
  const lesson = DATA.find(item => item.id === currentView);
  if (lesson) renderLesson(lesson); else renderHome();
}

function toast(message) {
  document.querySelector('.toast')?.remove();
  const element = document.createElement('div');
  element.className = 'toast'; element.textContent = message;
  Object.assign(element.style, { position:'fixed', right:'20px', bottom:'20px', zIndex:'100', padding:'12px 17px', borderRadius:'10px', background:'#163653', color:'#fff', boxShadow:'0 10px 30px rgba(0,0,0,.22)' });
  document.body.appendChild(element); setTimeout(() => element.remove(), 2400);
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('recordings')) request.result.createObjectStore('recordings'); };
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}

async function putRecording(key, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => { const tx = db.transaction('recordings', 'readwrite'); tx.objectStore('recordings').put({ blob, updatedAt: new Date().toISOString() }, key); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
}

async function getRecording(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => { const request = db.transaction('recordings').objectStore('recordings').get(key); request.onsuccess = () => resolve(request.result || null); request.onerror = () => reject(request.error); });
}

async function loadRecordingPreviews() {
  for (const root of document.querySelectorAll('[data-recording-key]')) {
    const key = root.dataset.recordingKey;
    const saved = await getRecording(key);
    if (!saved) continue;
    const status = root.querySelector('[data-record-status]');
    const playback = root.querySelector('[data-record-playback]');
    status.textContent = '录音已保存'; playback.src = URL.createObjectURL(saved.blob); playback.hidden = false;
  }
}

function bindRecordButtons(lesson) {
  document.querySelectorAll('[data-record]').forEach(button => button.addEventListener('click', () => toggleRecording(button.dataset.record, button, lesson)));
}

async function toggleRecording(key, button, lesson) {
  if (activeRecorder) {
    if (activeRecorder.key !== key) return toast('请先结束当前录音');
    activeRecorder.recorder.stop(); return;
  }
  if (!navigator.mediaDevices?.getUserMedia) return toast('当前浏览器不支持录音');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = []; const recorder = new MediaRecorder(stream);
    const clipId = key.replace(RECORD_PREFIX, '');
    const clip = state.lessons[lesson.id]?.clips?.[clipId];
    if (clip?.endedAt && clip.responseMs === null) clip.responseMs = Math.max(0, Date.now() - clip.endedAt);
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = async () => {
      stream.getTracks().forEach(track => track.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      await putRecording(key, blob); activeRecorder = null; saveState('录音已保存'); renderLesson(lesson);
    };
    recorder.start(); activeRecorder = { key, recorder };
    button.classList.add('recording'); button.textContent = '■ 停止并保存';
    button.parentElement.querySelector('.record-status').textContent = '正在录音…';
  } catch { toast('无法使用麦克风，请检查浏览器权限'); }
}

function downloadBlob(blob, filename) {
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function exportState() {
  const payload = { student:'Zhcw', module:'双速度训练', exportedAt:new Date().toISOString(), metrics:getMetrics(), state };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'}), `Zhcw_双速度训练_${new Date().toISOString().slice(0,10)}.json`);
  toast('学习记录已导出');
}

function createCheckinCanvas() {
  const metrics = getMetrics();
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  const round = (x,y,w,h,r,fill) => { ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fillStyle=fill; ctx.fill(); };
  ctx.fillStyle='#eaf4f2'; ctx.fillRect(0,0,1080,1350); round(60,55,960,1240,34,'#fff');
  round(100,100,80,80,20,'#0e988b'); ctx.fillStyle='#fff'; ctx.font='800 44px Arial'; ctx.textAlign='center'; ctx.fillText('Z',140,155);
  ctx.textAlign='left'; ctx.fillStyle='#163653'; ctx.font='800 48px "Microsoft YaHei",sans-serif'; ctx.fillText('双速度训练打卡',210,153);
  ctx.fillStyle='#66778a'; ctx.font='24px "Microsoft YaHei",sans-serif'; ctx.fillText(`Zhcw · ${new Date().toLocaleDateString('zh-CN')}`,100,230);
  const cards=[['完成讲座',`${metrics.completed}/8`],['音频辨别',metrics.audioAccuracy===null?'—':`${Math.round(metrics.audioAccuracy*100)}%`],['开口反应',metrics.avgReaction===null?'—':`${metrics.avgReaction.toFixed(1)}秒`],['文本理解',metrics.textAccuracy===null?'—':`${Math.round(metrics.textAccuracy*100)}%`]];
  cards.forEach((card,index)=>{ const x=100+(index%2)*450,y=300+Math.floor(index/2)*190; round(x,y,410,150,20,index===0?'#163653':'#eef8f6'); ctx.fillStyle=index===0?'#c9dce7':'#537082'; ctx.font='22px "Microsoft YaHei",sans-serif'; ctx.fillText(card[0],x+28,y+42); ctx.fillStyle=index===0?'#fff':'#0e756c'; ctx.font='800 45px Arial'; ctx.fillText(card[1],x+28,y+105); });
  round(100,720,860,360,22,'#f5f8fa'); ctx.fillStyle='#0e988b'; ctx.font='800 27px "Microsoft YaHei",sans-serif'; ctx.fillText('本次训练判断',135,775);
  ctx.fillStyle='#26384b'; ctx.font='25px "Microsoft YaHei",sans-serif';
  const text=diagnosis(metrics); const chars=Array.from(text); let line='', lines=[]; chars.forEach(ch=>{ const next=line+ch; if(ctx.measureText(next).width>780&&line){lines.push(line);line=ch;}else line=next;}); if(line)lines.push(line); lines.slice(0,7).forEach((value,i)=>ctx.fillText(value,135,830+i*42));
  ctx.fillStyle='#66778a'; ctx.font='22px "Microsoft YaHei",sans-serif'; ctx.textAlign='center'; ctx.fillText('Zhcw Listening × Speaking Lab',540,1225); return canvas;
}

function showCheckinReport() {
  const canvas = createCheckinCanvas(); const modal = document.getElementById('report-modal');
  modal.querySelector('.report-preview').src = canvas.toDataURL('image/png'); modal.showModal();
  modal.querySelector('#download-report').onclick = () => canvas.toBlob(blob => downloadBlob(blob, `Zhcw_双速度训练_${new Date().toISOString().slice(0,10)}_打卡.png`), 'image/png');
}

document.getElementById('menu-btn').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));
document.getElementById('results-btn').addEventListener('click', () => navigate('results'));
document.getElementById('export-btn').addEventListener('click', exportState);
document.getElementById('report-btn').addEventListener('click', showCheckinReport);
document.querySelector('.modal-close').addEventListener('click', () => document.getElementById('report-modal').close());

render();
