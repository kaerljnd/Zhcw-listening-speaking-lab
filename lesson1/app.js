const AUDIO = 'assets/audio/';
const STORAGE_KEY = 'zhcw.lesson1.v1';
const MIC_SESSION_KEY = 'zhcw.lesson1.microphoneReady';

const basicItems = [
  ['01', '01_basic_classroom_app.mp3', 'Have you tried the new classroom management app?', 'classroom management app', '课堂管理应用程序'],
  ['02', '02_basic_same_advisor.mp3', 'I just learned that Abby and I have the same advisor.', 'the same advisor', '同一位学业导师'],
  ['03', '03_basic_student_forum.mp3', 'When is the student government forum starting?', 'student government forum', '学生会论坛；学生会座谈会'],
  ['04', '04_basic_deadline.mp3', 'When is the deadline for the project?', 'project deadline', '项目截止日期'],
  ['05', '05_basic_gauge_satisfaction.mp3', 'How can we gauge student satisfaction?', 'gauge student satisfaction', '衡量学生满意度'],
  ['06', '06_basic_seminar.mp3', 'The seminar will be held next Tuesday.', 'seminar will be held', '研讨会将于……举行'],
  ['07', '07_basic_resend_email.mp3', 'Could you please resend that email to the whole class?', 'resend the email to the whole class', '把邮件重新发送给全班'],
  ['08', '08_basic_chem_lab.mp3', 'What time is the next chem lab?', 'chemistry lab', '化学实验课']
];

const academicVocab = [
  ['navigation', '航海；导航', 'long-distance navigation'],
  ['celestial body', '天体', 'celestial bodies were obscured'],
  ['magnetic compass', '磁罗盘', 'a transformative technology'],
  ['magnetized needle', '磁化指针', 'indicate direction'],
  ['maintain a heading', '保持航向', 'even when visibility was poor'],
  ['obscure', '遮蔽', 'obscured by clouds or fog'],
  ['venture into', '冒险进入', 'venture into open seas'],
  ['precision', '精确度', 'with confidence and precision'],
  ['maritime route', '海上航线', 'chart new maritime routes'],
  ['reshape global trade', '重塑全球贸易', 'connect continents and reshape trade'],
  ['astrolabe', '星盘', 'another navigation tool'],
  ['usher in', '开启；引入', 'usher in the Age of Exploration']
];

const repeatItems = [
  ['15', '15_repeat_01.mp3', 'Welcome to our campus tour.', 'welcome · campus tour'],
  ['16', '16_repeat_02.mp3', 'The enrollment office is straight ahead.', 'enrollment office · straight ahead'],
  ['17', '17_repeat_03.mp3', 'Next door you will see the library.', 'next door · library'],
  ['18', '18_repeat_04.mp3', 'The cafeteria has many meal options available.', 'cafeteria · meal options · available'],
  ['19', '19_repeat_05.mp3', 'The university lecture halls are located over here.', 'lecture halls · located over here'],
  ['20', '20_repeat_06.mp3', 'If you have any questions, please stop by the information desk.', 'questions · stop by · information desk'],
  ['21', '21_repeat_07.mp3', 'Lastly, please also remember to check the event schedule at the entrance.', 'lastly · event schedule · entrance']
];

const interviewItems = [
  ['Q1', '22_interview_q1.mp3', 'Do you have a hobby or interest that you regularly spend time doing?', '描述兴趣 + 频率 + 收获'],
  ['Q2', '23_interview_q2.mp3', 'If you were to select a new hobby, what would you choose and why?', '选择 + 两个理由 / 第一步'],
  ['Q3', '24_interview_q3.mp3', 'What might prevent you from starting this new pastime?', '障碍 + 原因 + 解决办法'],
  ['Q4', '25_interview_q4.mp3', 'Is it better to dedicate yourself to one interest or have multiple smaller ones?', '立场 + 比较 + 条件 / 例子']
];

const navItems = [
  ['home', '路线', '今日学习路线'],
  ['basic', '1–3', '基础词汇听辨'],
  ['conversation', '4', '校园对话证据'],
  ['academic', '5', '学术讲座结构'],
  ['vocab', '6–7', '词汇教学与验证'],
  ['repeat', '8', 'Listen & Repeat'],
  ['interview', '9–10', 'Hobbies Interview'],
  ['transfer', '11', '迁移与退出检测']
];

const defaultState = () => ({
  version: 1,
  startedAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  activeScreen: 'home',
  completed: {},
  plays: {},
  basic: { phase: 1, current: 0, items: {} },
  conversation: { outdoor: {}, volunteer: {}, transfers: ['', '', ''] },
  academic: { early: '', function: '', impact: '', submitted: false },
  vocab: {},
  vocabCurrent: 0,
  evidence: {},
  repeat: {},
  interview: {},
  transfer: { plan: '', basicRecall: '', academicRecall: '', review: '' },
  teacherNotes: {},
  log: []
});

let state = loadState();
let activeRecorder = null;
let activeTimer = null;
let toastTimer = null;
let microphoneState = sessionStorage.getItem(MIC_SESSION_KEY) === '1' ? 'granted' : 'unknown';

const screen = document.getElementById('screen');
const nav = document.getElementById('task-nav');
const titleEl = document.getElementById('screen-title');
const eyebrowEl = document.getElementById('screen-eyebrow');

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || parsed.version !== 1) return defaultState();
    const restored = { ...defaultState(), ...parsed };
    if (restored.activeScreen === 'dashboard') restored.activeScreen = restored.completed.transfer ? 'transfer' : 'home';
    return restored;
  } catch { return defaultState(); }
}

function saveState(message = '') {
  state.lastActiveAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateProgress();
  renderNav();
  if (message) toast(message);
}

function logEvent(type, detail = {}) {
  state.log.push({ at: new Date().toISOString(), type, ...detail });
  if (state.log.length > 300) state.log = state.log.slice(-300);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
}

function normalize(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function similarity(a, b) {
  const x = normalize(a), y = normalize(b);
  if (!x && !y) return 1;
  if (!x || !y) return 0;
  const rows = x.length + 1, cols = y.length + 1;
  const dp = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) for (let j = 1; j < cols; j++) {
    dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + (x[i-1] === y[j-1] ? 0 : 1));
  }
  return Math.max(0, 1 - dp[x.length][y.length] / Math.max(x.length, y.length));
}

function keywordScore(answer, keywords) {
  const text = normalize(answer);
  const hits = keywords.filter(k => text.includes(normalize(k)));
  return { hits, score: hits.length / keywords.length };
}

function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function audioPanel(file, label) {
  const id = file.replace(/\W/g, '_');
  return `<div class="audio-panel">
    <div class="audio-icon">▶</div>
    <audio controls preload="metadata" data-audio-id="${id}"><source src="${AUDIO}${file}" type="audio/mpeg"></audio>
    <div class="play-count">${escapeHtml(label)} · 已播放 <span data-play-count="${id}">${state.plays[id] || 0}</span> 次</div>
  </div>`;
}

function attachAudioTracking() {
  document.querySelectorAll('audio[data-audio-id]').forEach(audio => {
    audio.addEventListener('play', () => {
      const id = audio.dataset.audioId;
      state.plays[id] = (state.plays[id] || 0) + 1;
      document.querySelectorAll(`[data-play-count="${id}"]`).forEach(x => x.textContent = state.plays[id]);
      saveState();
    }, { once: true });
  });
}

function choice(name, value, label, checked = false) {
  return `<label class="choice"><input type="radio" name="${name}" value="${escapeHtml(value)}" ${checked ? 'checked' : ''}><span>${escapeHtml(label)}</span></label>`;
}

function paper(title, subtitle, body, badge = '') {
  return `<article class="paper"><div class="paper-head"><div><div class="kicker">LESSON 1</div><h2>${title}</h2><p>${subtitle}</p></div>${badge ? `<span class="badge">${badge}</span>` : ''}</div>${body}</article>`;
}

function renderNav() {
  nav.innerHTML = navItems.map(([id, num, label]) => {
    const done = state.completed[id] || id === 'home';
    return `<button class="nav-item ${state.activeScreen === id ? 'active' : ''} ${done ? 'done' : ''}" data-nav="${id}">
      <span class="nav-num">${num}</span><span>${label}</span><span class="nav-status">${done ? '✓' : '○'}</span>
    </button>`;
  }).join('');
  nav.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.nav)));
}

function updateProgress() {
  const ids = navItems.filter(x => x[0] !== 'home').map(x => x[0]);
  const done = ids.filter(id => state.completed[id]).length;
  const pct = Math.round(done / ids.length * 100);
  document.getElementById('progress-text').textContent = `${pct}%`;
  document.getElementById('progress-bar').style.width = `${pct}%`;
}

function navigate(id) {
  state.activeScreen = id;
  saveState();
  document.querySelector('.sidebar').classList.remove('open');
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function render() {
  const current = navItems.find(x => x[0] === state.activeScreen) || navItems[0];
  titleEl.textContent = current[2];
  eyebrowEl.textContent = 'STUDENT WORKSPACE';
  const routes = {
    home: renderHome, basic: renderBasic, conversation: renderConversation,
    academic: renderAcademic, vocab: renderVocab, repeat: renderRepeat,
    interview: renderInterview, transfer: renderTransfer
  };
  (routes[state.activeScreen] || renderHome)();
  attachAudioTracking();
  loadRecordingPreviews();
  renderNav();
  updateProgress();
}

function renderHome() {
  const body = `<div class="paper-body">
    <div class="instruction"><strong>今天不做纸笔记录。</strong><span>网页会保存你的回答、词汇障碍和录音。先听再判断；需要两轮仍然听不清时，程序才显示文本。</span></div>
    <div class="permission-card" id="microphone-permission-card">
      <div class="permission-icon">🎙</div>
      <div class="permission-copy">
        <strong>开始前统一开启麦克风</strong>
        <span>首次使用时，Chrome只会在这里申请一次权限。请选择“访问该网站时允许”，后面的录音题将直接开始录音。</span>
        <span class="permission-status" id="microphone-status">正在检查麦克风权限…</span>
      </div>
      <button class="secondary-btn" id="microphone-permission-btn">检查并开启</button>
    </div>
    <div class="route-grid">
      ${[
        ['01', '发现', '通过真题冷听找出真正不熟悉的词与句子'],
        ['02', '辨别', '区分“不认识、认识但没听出、组合失败”'],
        ['03', '复述', '把证据句从“听懂”推进到“能够说出”'],
        ['04', '迁移', '把听力词块用于Hobbies口语表达']
      ].map(x => `<div class="route-card"><div class="route-index">${x[0]}</div><strong>${x[1]}</strong><p>${x[2]}</p></div>`).join('')}
    </div>
    <div class="control-row" style="margin-top:24px"><button class="primary-btn" id="start-lesson">开启麦克风并开始 Lesson 1</button></div>
  </div>`;
  screen.innerHTML = paper('兴趣与探索', '预计教学240分钟；建议在课堂中分段完成。所有内容会自动保存到当前浏览器。', body, '无纸化课堂');
  document.getElementById('microphone-permission-btn').addEventListener('click', requestMicrophoneAccess);
  document.getElementById('start-lesson').addEventListener('click', async () => {
    const ready = microphoneState === 'granted' || await requestMicrophoneAccess();
    if (ready) navigate('basic');
  });
  refreshMicrophoneStatus();
}

function updateMicrophoneStatus() {
  const status = document.getElementById('microphone-status');
  const button = document.getElementById('microphone-permission-btn');
  const start = document.getElementById('start-lesson');
  if (!status || !button || !start) return;
  const messages = {
    granted: ['已允许：本次课程后续录音不会重复询问', '重新检查'],
    denied: ['已阻止：请点击地址栏左侧“文件”并把麦克风改为允许', '重新申请'],
    error: ['未检测到可用麦克风，请检查Chrome与macOS权限', '重新检查'],
    prompt: ['尚未授权：点击后请选择“访问该网站时允许”', '检查并开启'],
    unknown: ['尚未授权：点击后请选择“访问该网站时允许”', '检查并开启']
  };
  const [message, label] = messages[microphoneState] || messages.unknown;
  status.textContent = message;
  status.dataset.state = microphoneState;
  button.textContent = label;
  start.textContent = microphoneState === 'granted' ? '开始 Lesson 1' : '开启麦克风并开始 Lesson 1';
}

async function refreshMicrophoneStatus() {
  if (!navigator.mediaDevices?.getUserMedia) {
    microphoneState = 'error';
    updateMicrophoneStatus();
    return;
  }
  try {
    if (navigator.permissions?.query) {
      const permission = await navigator.permissions.query({ name: 'microphone' });
      microphoneState = permission.state;
      if (permission.state === 'granted') sessionStorage.setItem(MIC_SESSION_KEY, '1');
      permission.onchange = () => {
        microphoneState = permission.state;
        if (permission.state === 'granted') sessionStorage.setItem(MIC_SESSION_KEY, '1');
        else sessionStorage.removeItem(MIC_SESSION_KEY);
        updateMicrophoneStatus();
      };
    }
  } catch {
    // file:// pages may not expose the Permissions API; the start button still
    // performs the real getUserMedia check in one user-initiated action.
  }
  updateMicrophoneStatus();
}

async function requestMicrophoneAccess() {
  if (!navigator.mediaDevices?.getUserMedia) {
    microphoneState = 'error';
    updateMicrophoneStatus();
    toast('当前浏览器不支持录音，请使用最新版Chrome打开');
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    microphoneState = 'granted';
    sessionStorage.setItem(MIC_SESSION_KEY, '1');
    updateMicrophoneStatus();
    toast('麦克风已开启，后续录音无需重复授权');
    return true;
  } catch (error) {
    microphoneState = error?.name === 'NotAllowedError' ? 'denied' : 'error';
    sessionStorage.removeItem(MIC_SESSION_KEY);
    updateMicrophoneStatus();
    toast(microphoneState === 'denied' ? '麦克风被阻止，请在地址栏权限中改为允许' : '未能开启麦克风，请检查设备权限');
    return false;
  }
}

function getBasicItem(id) {
  if (!state.basic.items[id]) state.basic.items[id] = { first:'', second:'', confidence:'', suspect:false, barrier:'', third:'' };
  return state.basic.items[id];
}

function renderBasic() {
  const phase = state.basic.phase || 1;
  const tabs = `<div class="phase-tabs">
    <button class="phase-tab ${phase===1?'active':''}" data-basic-phase="1">1 冷听</button>
    <button class="phase-tab ${phase===2?'active':''}" data-basic-phase="2" ${phase<2?'disabled':''}>2 自我定位</button>
    <button class="phase-tab ${phase===3?'active':''}" data-basic-phase="3" ${phase<3?'disabled':''}>3 文本分析</button>
  </div>`;
  let content = '';
  if (phase === 1) content = renderBasicCold();
  if (phase === 2) content = renderBasicLocate();
  if (phase === 3) content = renderBasicAnalysis();
  screen.innerHTML = paper('基础词汇听辨', '完成8个校园短句。第一阶段不显示文本；程序只告诉你有多少项需要复查。', tabs + `<div class="paper-body">${content}</div>`, `阶段 ${phase}/3`);
  bindBasic();
}

function renderBasicCold() {
  const idx = Math.min(state.basic.current || 0, basicItems.length - 1);
  const [id, file] = basicItems[idx];
  const item = getBasicItem(id);
  const answered = basicItems.filter(x => getBasicItem(x[0]).first.trim()).length;
  return `<div class="instruction"><strong>冷启动：</strong><span>每句先完整听一次，写下你听到的英文或关键词，再标记信心。不要查词。</span></div>
    <div class="question-card">
      <header><h3>Audio ${id}</h3><span class="status-dot ${item.first?'done':''}">${answered}/8 已完成</span></header>
      ${audioPanel(file, '第一次听')}
      <div class="field"><label>你听到了什么？</label><textarea id="basic-first" placeholder="可以写完整句，也可以先写关键词">${escapeHtml(item.first)}</textarea></div>
      <div class="field"><span class="field-label">信心标记</span><div class="choice-row">
        ${choice('basic-confidence','A','A 听清并能说出依据',item.confidence==='A')}
        ${choice('basic-confidence','B','B 基本理解，依据不完整',item.confidence==='B')}
        ${choice('basic-confidence','C','C 主要依靠猜测',item.confidence==='C')}
      </div></div>
      <div class="control-row"><button class="primary-btn" id="save-basic-first">保存并继续</button>${idx>0?'<button class="secondary-btn" id="basic-prev">上一句</button>':''}</div>
    </div>
    ${answered === 8 ? `<div class="result-box"><strong>8句已完成。</strong> 程序已完成第一轮比对，但不会显示原句。进入下一步检查你对自己听力状态的判断。</div><button class="primary-btn" id="to-basic-2" style="margin-top:14px">查看需要复查的数量</button>` : ''}`;
}

function renderBasicLocate() {
  const reviewCount = basicItems.filter(([id,,text]) => similarity(getBasicItem(id).first, text) < .62).length;
  return `<div class="instruction"><strong>第一轮结果：</strong><span>8项中有 <b>${reviewCount}</b> 项需要复查。现在不要看答案，先判断自己可能在哪几项出现了问题。</span></div>
    ${basicItems.map(([id,file]) => { const item=getBasicItem(id); return `<div class="question-card">
      <header><h3>Audio ${id}</h3><label class="choice"><input type="checkbox" data-suspect="${id}" ${item.suspect?'checked':''}><span>我认为这项需要复查</span></label></header>
      ${audioPanel(file, '第二次听')}
      <div class="field"><label>第二次听到的内容</label><textarea data-basic-second="${id}" placeholder="补充或修改你听到的内容">${escapeHtml(item.second)}</textarea></div>
    </div>`; }).join('')}
    <button class="primary-btn" id="to-basic-3">进入文本分析</button>`;
}

function renderBasicAnalysis() {
  return `<div class="instruction"><strong>现在才看文本。</strong><span>对照你两轮记录，选择真正的障碍类型；然后关闭文本再听一次，确认能否稳定辨认。</span></div>
    ${basicItems.map(([id,file,text,chunk]) => { const item=getBasicItem(id); const sim=similarity(item.second||item.first,text); return `<div class="question-card">
      <header><h3>Audio ${id} · ${escapeHtml(chunk)}</h3><span class="badge ${sim>=.75?'':'coral'}">匹配度 ${Math.round(sim*100)}%</span></header>
      ${audioPanel(file, '第三次验证')}
      <div class="transcript">${escapeHtml(text)}</div>
      <div class="field" style="margin-top:14px"><span class="field-label">具体障碍</span><div class="choice-row">
        ${choice(`barrier-${id}`,'U','U 不认识',item.barrier==='U')}
        ${choice(`barrier-${id}`,'S','S 认识但没听出来',item.barrier==='S')}
        ${choice(`barrier-${id}`,'C','C 组合理解失败',item.barrier==='C')}
        ${choice(`barrier-${id}`,'M','已掌握',item.barrier==='M')}
      </div></div>
      <div class="field"><span class="field-label">关闭文本后第三遍</span><div class="choice-row">
        ${choice(`third-${id}`,'yes','可以准确辨认',item.third==='yes')}
        ${choice(`third-${id}`,'no','仍需复查',item.third==='no')}
      </div></div>
    </div>`; }).join('')}
    <button class="primary-btn" id="complete-basic">保存并进入校园对话</button>`;
}

function bindBasic() {
  document.querySelectorAll('[data-basic-phase]').forEach(b => b.addEventListener('click', () => { state.basic.phase=Number(b.dataset.basicPhase); saveState(); renderBasic(); }));
  document.getElementById('save-basic-first')?.addEventListener('click', () => {
    const [id] = basicItems[state.basic.current || 0];
    const item = getBasicItem(id);
    item.first = document.getElementById('basic-first').value.trim();
    item.confidence = document.querySelector('input[name="basic-confidence"]:checked')?.value || '';
    if (!item.first || !item.confidence) return toast('请先填写听到的内容并选择信心');
    logEvent('basic_first_saved',{id});
    if (state.basic.current < basicItems.length - 1) state.basic.current++;
    saveState(); renderBasic();
  });
  document.getElementById('basic-prev')?.addEventListener('click', () => { state.basic.current=Math.max(0,state.basic.current-1); saveState(); renderBasic(); });
  document.getElementById('to-basic-2')?.addEventListener('click', () => { state.basic.phase=2; saveState(); renderBasic(); });
  document.querySelectorAll('[data-suspect]').forEach(x => x.addEventListener('change', e => { getBasicItem(e.target.dataset.suspect).suspect=e.target.checked; saveState(); }));
  document.querySelectorAll('[data-basic-second]').forEach(x => x.addEventListener('input', e => { getBasicItem(e.target.dataset.basicSecond).second=e.target.value; saveState(); }));
  document.getElementById('to-basic-3')?.addEventListener('click', () => { state.basic.phase=3; saveState(); renderBasic(); });
  basicItems.forEach(([id]) => {
    document.querySelectorAll(`input[name="barrier-${id}"]`).forEach(x => x.addEventListener('change', e => { getBasicItem(id).barrier=e.target.value; saveState(); }));
    document.querySelectorAll(`input[name="third-${id}"]`).forEach(x => x.addEventListener('change', e => { getBasicItem(id).third=e.target.value; saveState(); }));
  });
  document.getElementById('complete-basic')?.addEventListener('click', () => {
    const ready=basicItems.every(([id]) => getBasicItem(id).barrier && getBasicItem(id).third);
    if(!ready) return toast('请完成8项障碍分类和第三遍验证');
    state.completed.basic=true; logEvent('basic_completed'); saveState('基础听辨已完成'); navigate('conversation');
  });
}

function renderConversation() {
  const o=state.conversation.outdoor, v=state.conversation.volunteer;
  const body=`<div class="paper-body">
    <div class="instruction"><strong>目标：</strong><span>先回答问题，再用“题目对应句 + 必要上下文”解释依据。提交后才显示证据。</span></div>
    <div class="question-card"><header><h3>Audio 09 · Outdoor Concert</h3><span class="badge">单选</span></header>
      ${audioPanel('09_conversation_outdoor_concert.mp3','完整对话')}
      <div class="question-text">Will the concert definitely be canceled?</div>
      <div class="choice-row">
        ${choice('outdoor-answer','A','A. Yes. The forecast says it will rain.',o.answer==='A')}
        ${choice('outdoor-answer','B','B. No. It is still planned, but one student is unsure.',o.answer==='B')}
        ${choice('outdoor-answer','C','C. No. Both students have decided to attend.',o.answer==='C')}
      </div>
      <div class="field" style="margin-top:16px"><label>你听到的答案依据</label><textarea id="outdoor-evidence">${escapeHtml(o.evidence||'')}</textarea></div>
      <button class="primary-btn" id="submit-outdoor">提交</button>
      ${o.submitted?`<div class="result-box ${o.answer==='B'?'good':'review'}">${o.answer==='B'?'选择正确。':'需要修正。'} 核心证据是 <b>rain or shine</b> 和 <b>we might get a dry window</b>；“I’ll think about it”说明其中一人尚未决定。</div><div class="transcript">They said it’s on rain or shine. Plus, we might get a dry window in the evening. — Hmm, I’ll think about it.</div>`:''}
    </div>
    <div class="question-card"><header><h3>Audio 10 · Book Reading & Volunteering</h3><span class="badge">证据定位</span></header>
      ${audioPanel('10_conversation_volunteering.mp3','完整对话')}
      <div class="two-grid"><div class="field"><label>Why did the speaker miss the book reading?</label><textarea id="vol-reason">${escapeHtml(v.reason||'')}</textarea></div><div class="field"><label>What was the downside of the event?</label><textarea id="vol-downside">${escapeHtml(v.downside||'')}</textarea></div></div>
      <button class="primary-btn" id="submit-volunteer">提交</button>
      ${v.submitted?`<div class="result-box ${v.score>=1.5?'good':'review'}">关键词命中 ${v.score||0}/2。原因：<b>got stuck helping out with a volunteer event at the animal shelter</b>。缺点：<b>the Q&A session was so short</b>。</div><div class="transcript">I wanted to go, but I got stuck helping out with a volunteer event. The animal shelter really needed help. … The only downside was that the question-and-answer session was so short.</div>`:''}
    </div>
    <h3 style="color:var(--navy)">听力词块迁移</h3>
    ${['How can the school gauge student satisfaction?','Explain a time you got stuck helping someone.','Would you attend an outdoor activity rain or shine?'].map((q,i)=>`<div class="field"><label>${i+1}. ${q}</label><textarea data-conv-transfer="${i}">${escapeHtml(state.conversation.transfers[i]||'')}</textarea></div>`).join('')}
    <button class="primary-btn" id="complete-conversation">保存并进入学术讲座</button>
  </div>`;
  screen.innerHTML=paper('校园对话：从答案回到证据','把“做对题”转化为“听清证据并能复述”。',body,'Audio 09–10');
  document.getElementById('submit-outdoor').addEventListener('click',()=>{
    o.answer=document.querySelector('input[name="outdoor-answer"]:checked')?.value||''; o.evidence=document.getElementById('outdoor-evidence').value.trim();
    if(!o.answer) return toast('请选择答案'); o.submitted=true; saveState(); renderConversation();
  });
  document.getElementById('submit-volunteer').addEventListener('click',()=>{
    v.reason=document.getElementById('vol-reason').value.trim(); v.downside=document.getElementById('vol-downside').value.trim();
    if(!v.reason||!v.downside) return toast('请完成两个问题');
    const a=keywordScore(v.reason,['help','volunteer','animal shelter']).score; const b=keywordScore(v.downside,['short','question']).score;
    v.score=Math.round((a+b)*10)/10; v.submitted=true; saveState(); renderConversation();
  });
  document.querySelectorAll('[data-conv-transfer]').forEach(x=>x.addEventListener('input',e=>{state.conversation.transfers[Number(e.target.dataset.convTransfer)]=e.target.value;saveState();}));
  document.getElementById('complete-conversation').addEventListener('click',()=>{
    if(!o.submitted||!v.submitted) return toast('请先完成两组对话');
    state.completed.conversation=true; logEvent('conversation_completed'); saveState('校园对话已完成'); navigate('academic');
  });
}

function renderAcademic() {
  const a=state.academic;
  const body=`<div class="paper-body">
    <div class="instruction"><strong>完整听一遍：</strong><span>不要逐词记录，只捕捉“早期方法—指南针功能—历史影响”三段结构。</span></div>
    ${audioPanel('11_academic_compass_full.mp3','Age of Exploration')}
    <div class="three-grid">
      <div class="field"><label>1. Early methods</label><textarea id="acad-early" placeholder="How did sailors navigate?">${escapeHtml(a.early)}</textarea></div>
      <div class="field"><label>2. Compass function</label><textarea id="acad-function" placeholder="What problem did it solve?">${escapeHtml(a.function)}</textarea></div>
      <div class="field"><label>3. Historical impact</label><textarea id="acad-impact" placeholder="How did it change exploration and trade?">${escapeHtml(a.impact)}</textarea></div>
    </div>
    <button class="primary-btn" id="submit-academic">检查结构</button>
    ${a.submitted?`<div class="three-grid" style="margin-top:20px">
      <div class="soft-card"><strong>Early methods</strong><p>coastal landmarks · Sun and stars · ocean tides · daylight patterns</p></div>
      <div class="soft-card"><strong>Compass function</strong><p>magnetized needle · indicate direction · maintain a heading · clouds or fog</p></div>
      <div class="soft-card"><strong>Historical impact</strong><p>open seas · precision · maritime routes · reshape global trade</p></div>
    </div><div class="result-box ${a.score>=.6?'good':'review'}">结构关键词覆盖率：${Math.round((a.score||0)*100)}%。下一步不重讲全文，只训练影响理解的词汇和证据句。</div>`:''}
    <div class="control-row" style="margin-top:20px"><button class="primary-btn" id="complete-academic">保存并进入词汇训练</button></div>
  </div>`;
  screen.innerHTML=paper('学术讲座：Age of Exploration','先建立结构，再处理词汇。结构正确可以减少逐词翻译。',body,'Audio 11');
  document.getElementById('submit-academic').addEventListener('click',()=>{
    a.early=document.getElementById('acad-early').value.trim(); a.function=document.getElementById('acad-function').value.trim(); a.impact=document.getElementById('acad-impact').value.trim();
    if(!a.early||!a.function||!a.impact)return toast('请完成三个结构框');
    const scores=[keywordScore(a.early,['landmark','sun','star','tide']).score,keywordScore(a.function,['needle','direction','heading','cloud']).score,keywordScore(a.impact,['open sea','route','trade','precision']).score];
    a.score=scores.reduce((x,y)=>x+y,0)/3; a.submitted=true; saveState(); renderAcademic();
  });
  document.getElementById('complete-academic').addEventListener('click',()=>{
    if(!a.submitted)return toast('请先完成结构检查'); state.completed.academic=true; logEvent('academic_completed'); saveState(); navigate('vocab');
  });
}

function speakWord(word) {
  if (!('speechSynthesis' in window)) return toast('当前浏览器不支持词汇朗读');
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(word); u.lang='en-US'; u.rate=.85; speechSynthesis.speak(u);
}

function renderVocab() {
  state.evidence ||= {};
  const all=[...basicItems.map(([id,,text,chunk,meaning])=>[chunk,meaning,text,id,'基础校园词块']),...academicVocab.map((x,i)=>[...x,`A${i+1}`,'学术词汇'])];
  const marked=all.filter(x=>state.vocab[x[3]]?.status).length;
  const currentIndex=Math.max(0,Math.min(Number.isInteger(state.vocabCurrent)?state.vocabCurrent:0,all.length-1));
  state.vocabCurrent=currentIndex;
  const [word,meaning,context,currentId,wordType]=all[currentIndex];
  const currentVocab=state.vocab[currentId]||{};
  const evidenceItems=[
    ['12','12_academic_navigation_foundation.mp3','Early navigation','His journey demonstrated that long-distance navigation was possible through keen environmental awareness and methodical planning.',['navigation','awareness','planning']],
    ['13','13_academic_compass_function.mp3','Compass function','The compass allowed sailors to maintain a heading even when celestial bodies were obscured by clouds or fog.',['maintain a heading','celestial','obscured']],
    ['14','14_academic_compass_impact.mp3','Historical impact','The compass enabled mariners to venture into open seas with greater confidence and precision, chart new maritime routes, and reshape global trade.',['venture','precision','route','trade']]
  ];
  const body=`<div class="paper-body">
    <div class="instruction"><strong>听音分类：</strong><span>每次只处理1个词块。先点击“读音”，不要看中文；选择真实状态后，程序显示词义和原句语境，再进入下一个。</span></div>
    <div class="vocab-pager">
      <button class="small-btn" id="vocab-prev" ${currentIndex===0?'disabled':''}>← 上一个</button>
      <div class="vocab-pager-status"><strong>${currentIndex+1} / ${all.length}</strong><span>${escapeHtml(wordType)} · 已分类 ${marked}/${all.length}</span></div>
      <button class="small-btn" id="vocab-next" ${(currentIndex===all.length-1||!currentVocab.status)?'disabled':''}>下一个 →</button>
    </div>
    <div class="vocab-focus"><div class="vocab-card vocab-card-focus">
      <div class="word-type">${escapeHtml(wordType)}</div>
      <h3>${escapeHtml(word)}</h3>
      ${currentVocab.status?`<div class="vocab-reveal"><div><span>词义</span><strong>${escapeHtml(meaning)}</strong></div><div><span>原句语境</span><p>${escapeHtml(context)}</p></div></div>`:'<p class="vocab-hidden-hint">先听读音，再选择状态；选择后显示中文词义和原句。</p>'}
      <div class="control-row"><button class="small-btn" data-speak="${escapeHtml(word)}">🔊 读音</button></div>
      <div class="choice-row" style="margin-top:10px">
        ${choice(`vocab-${currentId}`,'U','U 不认识',currentVocab.status==='U')}${choice(`vocab-${currentId}`,'S','S 没听出',currentVocab.status==='S')}${choice(`vocab-${currentId}`,'C','C 组合失败',currentVocab.status==='C')}${choice(`vocab-${currentId}`,'M','已掌握',currentVocab.status==='M')}
      </div>
    </div></div>
    <div class="result-box" style="margin-top:20px">已分类 ${marked}/${all.length}。课堂不追求把所有词都记为“已掌握”，准确发现问题比虚假的完成率更重要。</div>
    <h3 style="color:var(--navy);margin-top:28px">学术证据句：重听 → 还原 → 复述</h3>
    ${evidenceItems.map(([id,file,label,text])=>{const e=state.evidence[id]||{};return `<div class="question-card"><header><h3>Audio ${id} · ${label}</h3><span class="status-dot ${e.submitted?'done':''}">${e.submitted?'已核对':'待完成'}</span></header>
      ${audioPanel(file,'证据段')}
      <div class="field"><label>不看文本，写出你听到的证据句或关键词</label><textarea data-evidence-answer="${id}">${escapeHtml(e.answer||'')}</textarea></div>
      <button class="small-btn" data-evidence-submit="${id}">核对文本</button>
      ${e.submitted?`<div class="transcript">${escapeHtml(text)}</div>${recordingBlock('evidence',id,'录制证据句复述')}`:''}
    </div>`}).join('')}
    <button class="primary-btn" id="complete-vocab" style="margin-top:16px">保存并进入Listen & Repeat</button>
  </div>`;
  screen.innerHTML=paper('基础词汇 + 学术词汇','浏览器直接朗读词汇；课堂记录自动生成，不需要抄写词表。',body,`${marked}/${all.length}`);
  document.querySelectorAll('[data-speak]').forEach(b=>b.addEventListener('click',()=>speakWord(b.dataset.speak)));
  document.querySelectorAll(`input[name="vocab-${currentId}"]`).forEach(x=>x.addEventListener('change',e=>{state.vocab[currentId]={...(state.vocab[currentId]||{}),status:e.target.value,updatedAt:new Date().toISOString()};saveState();renderVocab();}));
  document.getElementById('vocab-prev').addEventListener('click',()=>{state.vocabCurrent=Math.max(0,currentIndex-1);saveState();renderVocab();});
  document.getElementById('vocab-next').addEventListener('click',()=>{if(!currentVocab.status)return toast('请先选择当前词汇的真实状态');state.vocabCurrent=Math.min(all.length-1,currentIndex+1);saveState();renderVocab();});
  document.querySelectorAll('[data-evidence-answer]').forEach(x=>x.addEventListener('input',e=>{const id=e.target.dataset.evidenceAnswer;state.evidence[id]={...(state.evidence[id]||{}),answer:e.target.value};saveState();}));
  document.querySelectorAll('[data-evidence-submit]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.evidenceSubmit;const item=evidenceItems.find(x=>x[0]===id);const answer=state.evidence[id]?.answer||'';if(!answer.trim())return toast('请先写下听到的内容');const result=keywordScore(answer,item[4]);state.evidence[id]={...(state.evidence[id]||{}),submitted:true,score:result.score};saveState();renderVocab();}));
  bindRecordButtons();
  document.getElementById('complete-vocab').addEventListener('click',async()=>{
    if(!all.every(x=>state.vocab[x[3]]?.status))return toast('请完成全部词汇的真实分类');
    const keys=await listRecordingKeys();if(!evidenceItems.every(x=>state.evidence[x[0]]?.submitted&&keys.includes(`evidence-${x[0]}`)))return toast('请完成3段证据句还原与复述录音');
    state.completed.vocab=true; logEvent('vocab_completed'); saveState('词汇分类已保存'); navigate('repeat');
  });
}

function recordingBlock(scope, slot, label) {
  const key=`${scope}-${slot}`;
  return `<div class="recorder"><div class="control-row"><button class="secondary-btn record-btn" data-record="${key}">● ${label}</button><span class="timer" data-record-timer="${key}">00:00</span></div><div class="recordings" data-record-preview="${key}"><span class="status-dot">尚无录音</span></div></div>`;
}

function renderRepeat() {
  const body=`<div class="paper-body"><div class="instruction"><strong>每句只播放一次再复述。</strong><span>先录音，再看关键词提示；如需第二轮，可覆盖原录音。评分必须反映独立完成情况。</span></div>
    ${repeatItems.map(([id,file,text,prompt],i)=>{const r=state.repeat[id]||{};return `<div class="question-card"><header><h3>Sentence ${i+1}</h3><span class="status-dot ${r.score!==undefined?'done':''}">${r.score!==undefined?`${r.score}/2`:'未评分'}</span></header>
      ${audioPanel(file,'原句')}
      ${recordingBlock('repeat',id,'录制复述')}
      <details><summary>录音后查看关键词提示</summary><div class="transcript">${escapeHtml(prompt)}</div><div class="transcript">${escapeHtml(text)}</div></details>
      <div class="field" style="margin-top:14px"><span class="field-label">独立完成评分</span><div class="choice-row">${choice(`repeat-score-${id}`,'0','0 无法完成',r.score===0)}${choice(`repeat-score-${id}`,'1','1 主要信息有缺失',r.score===1)}${choice(`repeat-score-${id}`,'2','2 信息完整清晰',r.score===2)}</div></div>
    </div>`}).join('')}
    <button class="primary-btn" id="complete-repeat">保存并进入Interview</button></div>`;
  screen.innerHTML=paper('Listen & Repeat','录音保存在当前浏览器。教师端可逐条播放、下载并比较。',body,'7句');
  bindRecordButtons();
  repeatItems.forEach(([id])=>document.querySelectorAll(`input[name="repeat-score-${id}"]`).forEach(x=>x.addEventListener('change',e=>{state.repeat[id]={...(state.repeat[id]||{}),score:Number(e.target.value)};saveState();})));
  document.getElementById('complete-repeat').addEventListener('click',async()=>{
    const scored=repeatItems.every(([id])=>state.repeat[id]?.score!==undefined); const keys=await listRecordingKeys(); const recorded=repeatItems.every(([id])=>keys.includes(`repeat-${id}`));
    if(!scored||!recorded)return toast('请完成7句录音与评分'); state.completed.repeat=true; logEvent('repeat_completed'); saveState(); navigate('interview');
  });
}

function renderInterview() {
  const body=`<div class="paper-body"><div class="instruction"><strong>两轮表达：</strong><span>第一轮自由表达，录音后整理“思路 + 3个词块”；第二轮限时45秒，不朗读完整稿。</span></div>
    ${interviewItems.map(([id,file,q,structure])=>{const x=state.interview[id]||{};return `<div class="question-card"><header><h3>${id}</h3><span class="badge">${escapeHtml(structure)}</span></header>
      ${audioPanel(file,'Interview prompt')}
      <div class="question-text">${escapeHtml(q)}</div>
      <div class="field"><label>第一轮前：简单组织思路</label><textarea data-interview="${id}" data-field="plan" placeholder="立场 / 理由 / 例子">${escapeHtml(x.plan||'')}</textarea></div>
      ${recordingBlock('interview',`${id}-first`,'第一轮自由表达')}
      <div class="two-grid"><div class="field"><label>整理后的思路地图</label><textarea data-interview="${id}" data-field="map" placeholder="只写关键词，不写完整稿">${escapeHtml(x.map||'')}</textarea></div><div class="field"><label>3个可复用词块</label><textarea data-interview="${id}" data-field="chunks" placeholder="chunk 1 / chunk 2 / chunk 3">${escapeHtml(x.chunks||'')}</textarea></div></div>
      <div class="control-row"><button class="small-btn" data-prep-timer="${id}">开始30秒准备</button><span class="timer" data-prep-display="${id}">00:30</span></div>
      ${recordingBlock('interview',`${id}-second`,'第二轮45秒表达')}
    </div>`}).join('')}
    <button class="primary-btn" id="complete-interview">保存并进入迁移练习</button></div>`;
  screen.innerHTML=paper('Hobbies Interview','所有录音自动按题目与轮次命名；不会上传到外部AI服务。',body,'Q1–Q4');
  bindRecordButtons();
  document.querySelectorAll('[data-interview]').forEach(x=>x.addEventListener('input',e=>{const id=e.target.dataset.interview;state.interview[id]={...(state.interview[id]||{}),[e.target.dataset.field]:e.target.value};saveState();}));
  document.querySelectorAll('[data-prep-timer]').forEach(b=>b.addEventListener('click',()=>startCountdown(30,document.querySelector(`[data-prep-display="${b.dataset.prepTimer}"]`))));
  document.getElementById('complete-interview').addEventListener('click',async()=>{
    const keys=await listRecordingKeys(); const ready=interviewItems.every(([id])=>keys.includes(`interview-${id}-first`)&&keys.includes(`interview-${id}-second`)&&state.interview[id]?.map&&state.interview[id]?.chunks);
    if(!ready)return toast('每题需要两轮录音、思路地图和3个词块'); state.completed.interview=true; logEvent('interview_completed'); saveState(); navigate('transfer');
  });
}

function renderTransfer() {
  if (state.completed.transfer) {
    renderCompletion();
    return;
  }
  const t=state.transfer;
  const body=`<div class="paper-body"><div class="instruction"><strong>迁移题：</strong><span>不要复述刚才的答案。用同一套思路和至少2个词块回答新的表面话题。</span></div>
    <div class="question-card"><div class="question-text">Would you rather explore several hobbies or focus on one skill for a year?</div>
      <div class="field"><label>30秒关键词计划</label><textarea id="transfer-plan" placeholder="position · why · example · 2 chunks">${escapeHtml(t.plan)}</textarea></div>
      <div class="control-row"><button class="small-btn" id="transfer-timer">开始30秒准备</button><span class="timer" id="transfer-display">00:30</span></div>
      ${recordingBlock('transfer','final','录制45秒回答')}
    </div>
    <div class="three-grid">
      <div class="field"><label>回忆3个基础词块</label><textarea id="recall-basic">${escapeHtml(t.basicRecall)}</textarea></div>
      <div class="field"><label>回忆3个学术词块</label><textarea id="recall-academic">${escapeHtml(t.academicRecall)}</textarea></div>
      <div class="field"><label>写出5个下次优先复查词</label><textarea id="recall-review">${escapeHtml(t.review)}</textarea></div>
    </div>
    <button class="primary-btn" id="complete-transfer">完成 Lesson 1</button></div>`;
  screen.innerHTML=paper('迁移与退出检测','课程结束后可导出学习记录并生成打卡图。',body,'最后一步');
  bindRecordButtons();
  document.getElementById('transfer-timer').addEventListener('click',()=>startCountdown(30,document.getElementById('transfer-display')));
  ['transfer-plan','recall-basic','recall-academic','recall-review'].forEach(id=>document.getElementById(id).addEventListener('input',e=>{const map={'transfer-plan':'plan','recall-basic':'basicRecall','recall-academic':'academicRecall','recall-review':'review'};state.transfer[map[id]]=e.target.value;saveState();}));
  document.getElementById('complete-transfer').addEventListener('click',async()=>{
    const keys=await listRecordingKeys(); if(!t.plan||!t.basicRecall||!t.academicRecall||!t.review||!keys.includes('transfer-final'))return toast('请完成迁移录音和退出检测');
    state.completed.transfer=true; logEvent('lesson_completed'); saveState('Lesson 1 已完成'); renderTransfer();
  });
}

function renderCompletion() {
  titleEl.textContent='课程完成';
  const body=`<div class="paper-body"><div class="completion-panel">
    <div class="completion-mark" aria-hidden="true">✓</div>
    <h3>Lesson 1 已完成</h3>
    <p>本课文字、选择和录音均已保存在当前浏览器。完成下面两步，即可保存本次学习成果。</p>
    <div class="completion-steps">
      <button class="completion-step" id="completion-export"><span>1</span><strong>导出学习记录</strong><small>保存本课 JSON 记录</small></button>
      <button class="completion-step" id="completion-report"><span>2</span><strong>生成打卡图</strong><small>预览并保存 PNG 图片</small></button>
    </div>
  </div></div>`;
  screen.innerHTML=paper('完成本课','学习成果保存在本机，请导出记录并生成打卡图。',body,'100%');
  document.getElementById('completion-export').addEventListener('click',exportState);
  document.getElementById('completion-report').addEventListener('click',showCheckinReport);
}

function startCountdown(seconds, el) {
  clearInterval(activeTimer); let left=seconds; el.textContent=`00:${String(left).padStart(2,'0')}`;
  activeTimer=setInterval(()=>{left--;el.textContent=`00:${String(Math.max(0,left)).padStart(2,'0')}`;if(left<=0){clearInterval(activeTimer);toast('准备时间结束');}},1000);
}

function renderDashboard() {
  const vocabRows=[];
  basicItems.forEach(([id,,text,chunk])=>{const b=getBasicItem(id),v=state.vocab[id]||{};if((b.barrier&&b.barrier!=='M')||(v.status&&v.status!=='M'))vocabRows.push([chunk,b.barrier||v.status,b.third==='yes'?'已听清':'需复查','基础']);});
  academicVocab.forEach(([word],i)=>{const v=state.vocab[`A${i+1}`]||{};if(v.status&&v.status!=='M')vocabRows.push([word,v.status,'需复查','学术']);});
  const repeatScores=repeatItems.map(([id])=>state.repeat[id]?.score).filter(x=>x!==undefined);
  const completed=Object.values(state.completed).filter(Boolean).length;
  const body=`<div class="paper-body">
    <div class="metric-grid">
      <div class="metric-card"><span>完成模块</span><strong>${completed}/7</strong></div>
      <div class="metric-card"><span>词汇复查队列</span><strong>${vocabRows.length}</strong></div>
      <div class="metric-card"><span>复述平均分</span><strong>${repeatScores.length?(repeatScores.reduce((a,b)=>a+b,0)/repeatScores.length).toFixed(1):'—'}</strong></div>
      <div class="metric-card"><span>已保存录音</span><strong id="recording-count">…</strong></div>
    </div>
    <h3 style="color:var(--navy);margin-top:28px">词汇复查队列</h3>
    ${vocabRows.length?`<table class="dashboard-table"><thead><tr><th>词 / 词块</th><th>障碍</th><th>当前状态</th><th>类型</th></tr></thead><tbody>${vocabRows.map(r=>`<tr>${r.map(x=>`<td>${escapeHtml(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>`:'<div class="empty">尚未形成复查队列</div>'}
    <h3 style="color:var(--navy);margin-top:28px">录音记录</h3><div id="teacher-recordings" class="recordings"><div class="empty">正在读取浏览器录音…</div></div>
    <h3 style="color:var(--navy);margin-top:28px">教师课堂备注</h3>
    <textarea class="teacher-note" id="teacher-summary" placeholder="记录本节课最重要的表现、提示后变化和下节课优先目标">${escapeHtml(state.teacherNotes.summary||'')}</textarea>
    <div class="control-row" style="margin-top:15px"><button class="primary-btn" id="save-teacher-note">保存备注</button><button class="secondary-btn" id="dashboard-export">导出JSON记录</button><button class="danger-btn" id="reset-all">清空本课数据</button></div>
  </div>`;
  screen.innerHTML=paper('教师数据面板','只呈现本学生、本课程的数据；录音和文本默认留在当前浏览器。',body,'Teacher');
  populateDashboardRecordings();
  document.getElementById('save-teacher-note').addEventListener('click',()=>{state.teacherNotes.summary=document.getElementById('teacher-summary').value;saveState('教师备注已保存');});
  document.getElementById('dashboard-export').addEventListener('click',exportState);
  document.getElementById('reset-all').addEventListener('click',resetAll);
}

function exportState() {
  const payload={student:'Zhcw',lesson:'Lesson 1 · Hobbies & Exploration',exportedAt:new Date().toISOString(),state};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); downloadBlob(blob,`Zhcw_Lesson1_${new Date().toISOString().slice(0,10)}.json`); toast('学习记录已导出');
}

function getCheckinData() {
  const basicDone=basicItems.filter(([id])=>getBasicItem(id).third).length;
  const basicClear=basicItems.filter(([id])=>getBasicItem(id).third==='yes').length;
  const conversationDone=[state.conversation.outdoor.submitted,state.conversation.volunteer.submitted].filter(Boolean).length;
  const vocabIds=[...basicItems.map(([id])=>id),...academicVocab.map((_,i)=>`A${i+1}`)];
  const vocabDone=vocabIds.filter(id=>state.vocab[id]?.status).length;
  const vocabReview=vocabIds.filter(id=>state.vocab[id]?.status&&state.vocab[id].status!=='M').length;
  const repeatScores=repeatItems.map(([id])=>state.repeat[id]?.score).filter(x=>x!==undefined);
  const interviewDone=interviewItems.filter(([id])=>state.interview[id]?.map&&state.interview[id]?.chunks).length;
  const completed=['basic','conversation','academic','vocab','repeat','interview','transfer'].filter(id=>state.completed[id]).length;
  const start=Date.parse(state.startedAt||''),end=Date.parse(state.lastActiveAt||'');
  const minutes=Number.isFinite(start)&&Number.isFinite(end)?Math.max(1,Math.round((end-start)/60000)):0;
  return {
    date:new Date().toLocaleDateString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'}),
    progress:Math.round(completed/7*100),minutes,
    rows:[
      ['基础词汇听辨',`${basicDone}/${basicItems.length} 句`,basicDone?`听清 ${basicClear} 句`:'未开始'],
      ['校园对话',`${conversationDone}/2 组`,conversationDone===2?'已完成':'继续练习'],
      ['学术讲座',state.academic.submitted?'1/1 篇':'0/1 篇',state.academic.submitted?'结构已检查':'未完成'],
      ['词汇学习',`${vocabDone}/${vocabIds.length} 个`,vocabReview?`复习 ${vocabReview} 个`:(vocabDone?'全部已掌握':'未开始')],
      ['句子复述',`${repeatScores.length}/${repeatItems.length} 句`,repeatScores.length?`均分 ${(repeatScores.reduce((a,b)=>a+b,0)/repeatScores.length).toFixed(1)}/2`:'未评分'],
      ['Interview与迁移',`${interviewDone}/4 + ${state.completed.transfer?'1':'0'}/1`,state.completed.transfer?'已完成':'继续练习']
    ]
  };
}

function roundRect(ctx,x,y,width,height,radius,fill,stroke='') {
  const r=Math.min(radius,width/2,height/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+width,y,x+width,y+height,r);ctx.arcTo(x+width,y+height,x,y+height,r);ctx.arcTo(x,y+height,x,y,r);ctx.arcTo(x,y,x+width,y,r);ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
}

function createCheckinCanvas() {
  const data=getCheckinData(),canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1500;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#eef7f5';ctx.fillRect(0,0,1200,1500);roundRect(ctx,70,60,1060,1380,34,'#fff','#bcebe3');
  roundRect(ctx,105,105,76,76,22,'#0e988b');ctx.fillStyle='#fff';ctx.font='800 42px Arial';ctx.textAlign='center';ctx.fillText('Z',143,158);
  ctx.textAlign='left';ctx.fillStyle='#0b756d';ctx.font='800 54px "Microsoft YaHei", sans-serif';ctx.fillText('今日学习报告',205,156);
  ctx.fillStyle='#63758a';ctx.font='500 27px "Microsoft YaHei", sans-serif';ctx.fillText(`Zhcw  ·  ${data.date}`,108,225);
  ctx.fillStyle='#173653';ctx.font='700 31px "Microsoft YaHei", sans-serif';ctx.fillText('Lesson 1 · 兴趣与探索',108,285);
  roundRect(ctx,900,120,170,94,47,'#d7f7f0');ctx.fillStyle='#08766d';ctx.font='800 34px Arial';ctx.textAlign='center';ctx.fillText(`${data.progress}%`,985,178);ctx.font='700 20px "Microsoft YaHei", sans-serif';ctx.fillText('课程进度',985,205);
  const x=108,y=370,w=984,hh=72,rh=112;roundRect(ctx,x,y,w,hh+data.rows.length*rh,20,'#fff','#d7e5e7');
  ctx.fillStyle='#163653';ctx.fillRect(x,y,w,hh);ctx.textAlign='left';ctx.fillStyle='#fff';ctx.font='700 24px "Microsoft YaHei", sans-serif';ctx.fillText('训练类型',145,y+46);ctx.fillText('完成数量',560,y+46);ctx.fillText('结果',835,y+46);
  data.rows.forEach((row,i)=>{const ry=y+hh+i*rh;ctx.fillStyle=i%2?'#f8fbfc':'#fff';ctx.fillRect(x+2,ry,w-4,rh);ctx.strokeStyle='#dfe9ec';ctx.beginPath();ctx.moveTo(x,ry);ctx.lineTo(x+w,ry);ctx.stroke();ctx.fillStyle='#203247';ctx.font='700 28px "Microsoft YaHei", sans-serif';ctx.fillText(row[0],145,ry+68);ctx.fillStyle='#4f6578';ctx.font='600 26px "Microsoft YaHei", sans-serif';ctx.fillText(row[1],560,ry+68);const pending=/未|继续/.test(row[2]);roundRect(ctx,820,ry+30,225,54,27,pending?'#fff0d6':'#d2f6ee');ctx.fillStyle=pending?'#9a6500':'#08766d';ctx.font='700 22px "Microsoft YaHei", sans-serif';ctx.textAlign='center';ctx.fillText(row[2],932,ry+65);ctx.textAlign='left';});
  roundRect(ctx,108,1185,984,120,18,'#edf8f6');ctx.fillStyle='#0e988b';ctx.font='800 26px "Microsoft YaHei", sans-serif';ctx.fillText('本次学习',142,1229);ctx.fillStyle='#173653';ctx.font='700 26px "Microsoft YaHei", sans-serif';ctx.fillText(`已记录约 ${data.minutes||1} 分钟  ·  听辨  ·  词汇  ·  复述  ·  迁移`,142,1271);ctx.fillStyle='#6a7a8b';ctx.font='500 21px "Microsoft YaHei", sans-serif';ctx.textAlign='center';ctx.fillText('Zhcw Listening × Speaking Lab',600,1380);
  return canvas;
}

function showCheckinReport() {
  document.getElementById('checkin-modal')?.remove();const canvas=createCheckinCanvas(),modal=document.createElement('div');modal.id='checkin-modal';modal.className='report-modal';
  modal.innerHTML=`<div class="report-dialog" role="dialog" aria-modal="true" aria-label="今日学习报告"><div class="report-dialog-head"><div><span>CHECK-IN REPORT</span><h2>今日学习报告</h2></div><button class="report-close" aria-label="关闭">×</button></div><img class="report-preview" alt="Zhcw 今日学习报告预览"><div class="report-actions"><button class="secondary-btn" data-report-close>关闭</button><button class="primary-btn" id="download-report">保存打卡图片</button></div></div>`;
  modal.querySelector('.report-preview').src=canvas.toDataURL('image/png');const close=()=>modal.remove();modal.querySelector('.report-close').addEventListener('click',close);modal.querySelector('[data-report-close]').addEventListener('click',close);modal.addEventListener('click',e=>{if(e.target===modal)close();});modal.querySelector('#download-report').addEventListener('click',()=>canvas.toBlob(blob=>{if(!blob)return toast('生成图片失败，请重试');downloadBlob(blob,`Zhcw_Lesson1_${new Date().toISOString().slice(0,10)}_打卡.png`);toast('打卡图片已保存');},'image/png'));document.body.appendChild(modal);
}

async function resetAll() {
  if(!confirm('确定清空 Lesson 1 的文字记录和全部录音吗？此操作无法撤销。'))return;
  localStorage.removeItem(STORAGE_KEY); await clearRecordings(); state=defaultState(); render(); toast('本课数据已清空');
}

function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}

// IndexedDB: audio recordings stay in this browser and are not sent to a server.
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('zhcw-listening-speaking-lab',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('recordings'))req.result.createObjectStore('recordings');};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function putRecording(key,blob){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('recordings','readwrite');tx.objectStore('recordings').put({blob,updatedAt:new Date().toISOString()},key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
async function getRecording(key){const db=await openDB();return new Promise((resolve,reject)=>{const req=db.transaction('recordings').objectStore('recordings').get(key);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});}
async function listRecordingKeys(){const db=await openDB();return new Promise((resolve,reject)=>{const req=db.transaction('recordings').objectStore('recordings').getAllKeys();req.onsuccess=()=>resolve(req.result.map(String));req.onerror=()=>reject(req.error);});}
async function clearRecordings(){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('recordings','readwrite');tx.objectStore('recordings').clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}

function bindRecordButtons(){document.querySelectorAll('[data-record]').forEach(btn=>btn.addEventListener('click',()=>toggleRecording(btn.dataset.record,btn)));}
async function toggleRecording(key,btn){
  if(activeRecorder){if(activeRecorder.key!==key)return toast('请先结束当前录音');activeRecorder.recorder.stop();return;}
  if(!navigator.mediaDevices?.getUserMedia)return toast('当前浏览器不支持录音');
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});const chunks=[];const recorder=new MediaRecorder(stream);
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onstop=async()=>{clearInterval(activeRecorder?.interval);stream.getTracks().forEach(t=>t.stop());const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});await putRecording(key,blob);activeRecorder=null;logEvent('recording_saved',{key,size:blob.size});saveState('录音已保存');render();};
    recorder.start();let sec=0;btn.classList.add('recording');btn.textContent='■ 停止并保存';const timer=document.querySelector(`[data-record-timer="${key}"]`);const interval=setInterval(()=>{sec++;if(timer)timer.textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;},1000);activeRecorder={key,recorder,interval};
  }catch(e){toast('无法使用麦克风，请检查浏览器权限');}
}

async function loadRecordingPreviews(){
  for(const el of document.querySelectorAll('[data-record-preview]')){const key=el.dataset.recordPreview;const data=await getRecording(key);if(!data)continue;const url=URL.createObjectURL(data.blob);el.innerHTML=`<div class="recording-row"><span class="status-dot done">已保存</span><audio controls src="${url}"></audio><button class="small-btn" data-download-record="${key}">下载</button></div>`;el.querySelector('[data-download-record]').addEventListener('click',()=>downloadBlob(data.blob,`${key}.webm`));}
}

async function populateDashboardRecordings(){
  const keys=await listRecordingKeys();const count=document.getElementById('recording-count');if(count)count.textContent=keys.length;const box=document.getElementById('teacher-recordings');if(!box)return;
  if(!keys.length){box.innerHTML='<div class="empty">暂无录音</div>';return;}
  box.innerHTML='';for(const key of keys){const data=await getRecording(key);const url=URL.createObjectURL(data.blob);const row=document.createElement('div');row.className='recording-row';row.innerHTML=`<strong>${escapeHtml(key)}</strong><audio controls src="${url}"></audio><button class="small-btn">下载</button>`;row.querySelector('button').addEventListener('click',()=>downloadBlob(data.blob,`${key}.webm`));box.appendChild(row);}
}

document.getElementById('export-btn').addEventListener('click',exportState);
document.getElementById('report-btn')?.addEventListener('click',showCheckinReport);
document.getElementById('mobile-menu').addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('open'));

render();
