/* 컴활 1급 필기 CBT 모의고사 - 엔진
 * 문제 은행: window.COMHWAL_DATA (컴활 개념게임과 공유)
 */
'use strict';

var DATA = window.COMHWAL_DATA || {};
var SUBJECTS = [
  { key: 'comp',   label: '1과목', name: '컴퓨터 일반' },
  { key: 'excel',  label: '2과목', name: '스프레드시트 일반' },
  { key: 'access', label: '3과목', name: '데이터베이스 일반' },
];
var PASS_AVG = 60, FAIL_UNDER = 40;   // 합격 평균 / 과락 기준

var exam = null;   // { qs:[], idx, minutes, deadline, timer, startTime }

/* ---------- 유틸 ---------- */
var $ = function (id) { return document.getElementById(id); };
function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }
function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function pad2(n) { return (n < 10 ? '0' : '') + n; }

/* ---------- 문제 은행 ---------- */
function poolOf(key) {
  var s = DATA[key];
  var arr = [];
  if (s && s.units) s.units.forEach(function (u) {
    (u.quiz || []).forEach(function (q) {
      arr.push({ subj: key, subjName: s.name, q: q.q, o: q.o, a: q.a, ex: q.ex, unit: u.name });
    });
  });
  return arr;
}
function makeQ(item) {
  var opts = item.o.map(function (t, i) { return { t: t, correct: i === item.a }; });
  opts = shuffle(opts);
  return {
    subj: item.subj, subjName: item.subjName, unit: item.unit,
    q: item.q, opts: opts, ans: opts.findIndex(function (o) { return o.correct; }),
    ex: item.ex, sel: null, flag: false,
  };
}
function buildExam(counts, minutes) {
  var qs = [];
  SUBJECTS.forEach(function (s) {
    var want = counts[s.key] || 0;
    var pool = shuffle(poolOf(s.key));
    for (var i = 0; i < want && i < pool.length; i++) qs.push(makeQ(pool[i]));
  });
  return { qs: qs, idx: 0, minutes: minutes, deadline: 0, timer: null, startTime: Date.now() };
}

/* ---------- 시작 화면 ---------- */
var MODES = [
  { nm: '실전 모의고사', ds: '60문항 · 60분 · 3과목', counts: { comp: 20, excel: 20, access: 20 }, min: 60 },
  { nm: '하프 모의고사', ds: '30문항 · 30분 · 3과목', counts: { comp: 10, excel: 10, access: 10 }, min: 30 },
  { nm: '컴퓨터 일반만', ds: '20문항 · 20분', counts: { comp: 20 }, min: 20 },
  { nm: '스프레드시트만', ds: '20문항 · 20분', counts: { excel: 20 }, min: 20 },
  { nm: '데이터베이스만', ds: '20문항 · 20분', counts: { access: 20 }, min: 20 },
];
function renderStart() {
  hide('loading'); show('start');
  var box = $('modeList'); box.innerHTML = '';
  MODES.forEach(function (m, i) {
    var el = document.createElement('div');
    el.className = 'modecard';
    el.innerHTML = '<div><div class="nm">' + m.nm + '</div><div class="ds">' + m.ds + '</div></div>' +
      '<div style="color:var(--pri2);font-weight:800">▶</div>';
    el.onclick = function () { startExam(m); };
    box.appendChild(el);
  });
}

/* ---------- 시험 진행 ---------- */
function startExam(m) {
  exam = buildExam(m.counts, m.min);
  if (!exam.qs.length) { alert('문제를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'); return; }
  exam.deadline = Date.now() + m.min * 60000;
  hide('start'); hide('result'); hide('review'); show('exam');
  $('totalCnt').textContent = exam.qs.length;
  startTimer();
  renderQ();
}
function startTimer() {
  clearInterval(exam.timer);
  tick();
  exam.timer = setInterval(tick, 1000);
}
function tick() {
  var left = Math.max(0, Math.round((exam.deadline - Date.now()) / 1000));
  var mm = Math.floor(left / 60), ss = left % 60;
  var el = $('timer');
  el.textContent = pad2(mm) + ':' + pad2(ss);
  el.classList.toggle('warn', left <= 300);
  if (left <= 0) { clearInterval(exam.timer); doSubmit(true); }
}
function answeredCount() {
  return exam.qs.filter(function (q) { return q.sel !== null; }).length;
}
function renderQ() {
  var q = exam.qs[exam.idx];
  var total = exam.qs.length;
  $('subjTag').textContent = q.subjName;
  $('answeredCnt').textContent = answeredCount();
  var opts = q.opts.map(function (o, i) {
    return '<div class="opt' + (q.sel === i ? ' sel' : '') + '" onclick="pick(' + i + ')">' +
      '<div class="k">' + 'ABCD'[i] + '</div><div>' + o.t + '</div></div>';
  }).join('');
  $('qhost').innerHTML =
    '<div class="qcard">' +
      '<div class="qmeta"><div class="no">' + (exam.idx + 1) + ' / ' + total + ' · ' + q.subjName + '</div>' +
        '<button class="flagbtn' + (q.flag ? ' on' : '') + '" onclick="toggleFlag()">🚩 다시 볼 문제</button></div>' +
      '<div class="qtext">' + q.q + '</div>' +
      '<div class="opts">' + opts + '</div>' +
    '</div>';
  $('prevBtn').disabled = exam.idx === 0;
  $('nextBtn').textContent = exam.idx === total - 1 ? '끝 · 제출하기' : '다음 →';
}
function pick(i) {
  exam.qs[exam.idx].sel = i;
  renderQ();
}
function toggleFlag() {
  exam.qs[exam.idx].flag = !exam.qs[exam.idx].flag;
  renderQ();
}
function go(d) {
  if (d > 0 && exam.idx === exam.qs.length - 1) { confirmSubmit(); return; }
  exam.idx = Math.min(exam.qs.length - 1, Math.max(0, exam.idx + d));
  renderQ();
}
function jump(i) { exam.idx = i; closePalette(); renderQ(); }

/* ---------- 팔레트 ---------- */
function openPalette() {
  var total = exam.qs.length;
  var cells = exam.qs.map(function (q, i) {
    var cls = 'pcell' + (q.sel !== null ? ' answered' : '') + (q.flag ? ' flagged' : '') + (i === exam.idx ? ' cur' : '');
    return '<div class="' + cls + '" onclick="jump(' + i + ')">' + (i + 1) + '</div>';
  }).join('');
  var d = document.createElement('div');
  d.className = 'drawer'; d.id = 'paletteDrawer';
  d.onclick = function (e) { if (e.target === d) closePalette(); };
  d.innerHTML = '<div class="panel"><div class="row" style="justify-content:space-between">' +
    '<b>문제 이동 (' + answeredCount() + '/' + total + ' 완료)</b>' +
    '<button class="btn ghost" style="padding:6px 12px" onclick="closePalette()">닫기</button></div>' +
    '<div class="palette">' + cells + '</div>' +
    '<div class="legend"><span><i style="background:var(--pri)"></i>푼 문제</span>' +
    '<span><i style="background:var(--card2);outline:2px solid var(--warn)"></i>다시 볼 문제</span>' +
    '<span><i style="background:var(--card2)"></i>안 푼 문제</span></div>' +
    '<button class="btn green" style="width:100%;margin-top:16px" onclick="closePalette();confirmSubmit()">답안 제출하기</button>' +
    '</div>';
  document.body.appendChild(d);
}
function closePalette() { var d = $('paletteDrawer'); if (d) d.remove(); }

/* ---------- 제출·채점 ---------- */
function confirmSubmit() {
  var un = exam.qs.length - answeredCount();
  var msg = un > 0 ? ('아직 풀지 않은 문제가 ' + un + '개 있습니다.\n제출하시겠어요?') : '답안을 제출하시겠어요?';
  if (confirm(msg)) doSubmit(false);
}
function grade() {
  var per = {};
  SUBJECTS.forEach(function (s) { per[s.key] = { total: 0, correct: 0, name: s.name }; });
  exam.qs.forEach(function (q) {
    per[q.subj].total++;
    if (q.sel === q.ans) per[q.subj].correct++;
  });
  var used = SUBJECTS.filter(function (s) { return per[s.key].total > 0; });
  var scores = used.map(function (s) {
    var p = per[s.key];
    return { key: s.key, name: p.name, correct: p.correct, total: p.total, score: Math.round(p.correct / p.total * 100) };
  });
  var avg = Math.round(scores.reduce(function (a, x) { return a + x.score; }, 0) / scores.length);
  var hasFail = scores.some(function (x) { return x.score < FAIL_UNDER; });
  var pass = !hasFail && avg >= PASS_AVG;
  var totalCorrect = exam.qs.filter(function (q) { return q.sel === q.ans; }).length;
  return { scores: scores, avg: avg, pass: pass, hasFail: hasFail, totalCorrect: totalCorrect, totalQ: exam.qs.length };
}
function doSubmit(auto) {
  clearInterval(exam.timer);
  closePalette();
  exam.result = grade();
  exam.durationSec = Math.round((Date.now() - exam.startTime) / 1000);
  showResult(auto);
}

function showResult(auto) {
  hide('exam'); hide('review'); show('result');
  var r = exam.result;
  var verdict = r.pass ? '합격' : '불합격';
  var emoji = r.pass ? '🎉' : '💪';
  var ss = r.scores.map(function (x) {
    var failMark = x.score < FAIL_UNDER ? '<div class="flag">과락</div>' : '';
    return '<div class="ss"><div class="nm">' + x.name + '</div>' +
      '<div class="sc' + (x.score < FAIL_UNDER ? ' fail' : '') + '">' + x.score + '</div>' +
      '<div class="nm">' + x.correct + '/' + x.total + '</div>' + failMark + '</div>';
  }).join('');
  var wrongN = r.totalQ - r.totalCorrect;
  var sub = auto ? '<div style="color:var(--no);font-size:13px;margin-bottom:6px">⏰ 시간 종료로 자동 제출됨</div>' : '';
  $('result').innerHTML =
    '<div class="result">' + sub +
      '<div style="font-size:48px">' + emoji + '</div>' +
      '<div class="verdict ' + (r.pass ? 'pass' : 'fail') + '">' + verdict + '</div>' +
      '<div class="totscore">평균 <b style="color:var(--tx)">' + r.avg + '점</b> · 정답 ' + r.totalCorrect + '/' + r.totalQ +
        ' · 소요 ' + Math.floor(exam.durationSec / 60) + '분</div>' +
      '<div class="subjscores">' + ss + '</div>' +
      (r.hasFail ? '<div style="color:var(--no);font-size:13px;margin-bottom:8px">한 과목 이상 40점 미만(과락)입니다.</div>' : '') +
      submitBtnHtml() +
      '<div class="row" style="justify-content:center;margin-top:8px;flex-wrap:wrap">' +
        '<button class="btn sec" onclick="openReview()">📝 오답노트 (' + wrongN + ')</button>' +
        '<button class="btn" onclick="renderStart()">다시 풀기</button>' +
      '</div>' +
    '</div>';
}

/* ---------- 결과 제출(collector) ---------- */
function submitEnabled() {
  return !!(window.ResultCollector && ResultCollector.config && ResultCollector.config.endpoint);
}
function submitBtnHtml() {
  if (!submitEnabled()) return '';
  return '<div class="row" style="justify-content:center;margin:6px 0 12px">' +
    '<button class="btn green" id="cbtSubmit" onclick="submitResult()">📤 선생님께 결과 제출</button></div>';
}
function submitResult() {
  if (!submitEnabled()) return;
  var r = exam.result;
  ResultCollector.open({
    score: r.avg,
    correct: r.totalCorrect,
    total: r.totalQ,
    durationSec: exam.durationSec,
    labels: { score: '평균점수', correct: '맞힘', total: '문항수', wrong: '합격여부' },
    wrong: r.pass ? '합격' : '불합격',
  });
}

/* ---------- 오답노트 ---------- */
function openReview() {
  var wrong = exam.qs.filter(function (q) { return q.sel !== q.ans; });
  hide('result'); show('review');
  $('reviewTitle').textContent = '오답노트 · ' + wrong.length + '문항';
  if (!wrong.length) {
    $('reviewHost').innerHTML = '<div class="qcard" style="text-align:center">🏆 틀린 문제가 없어요! 완벽합니다.</div>';
    return;
  }
  $('reviewHost').innerHTML = wrong.map(function (q) {
    var opts = q.opts.map(function (o, i) {
      var cls = 'opt';
      if (i === q.ans) cls += ' correct';
      else if (i === q.sel) cls += ' wrong';
      return '<div class="' + cls + '"><div class="k">' + 'ABCD'[i] + '</div><div>' + o.t +
        (i === q.ans ? ' ✔' : (i === q.sel ? ' ✖(내 답)' : '')) + '</div></div>';
    }).join('');
    var myAns = q.sel === null ? '<span style="color:var(--no)">미응답</span>' : ('ABCD'[q.sel]);
    return '<div class="reviewitem"><div class="no" style="font-size:12px;color:var(--tx2);font-weight:700;margin-bottom:6px">' +
      q.subjName + ' · ' + (q.unit || '') + '</div>' +
      '<div class="qtext" style="font-size:16px">' + q.q + '</div>' +
      '<div class="opts">' + opts + '</div>' +
      '<div class="exp"><b>해설</b><br>' + q.ex + '</div></div>';
  }).join('');
}

/* ---------- 초기화 ---------- */
function init() {
  var ready = DATA.comp && DATA.comp.units && DATA.excel && DATA.access;
  if (!ready) {
    $('loading').textContent = '문제 은행을 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침해 주세요.';
    return;
  }
  renderStart();
}
// 데이터 스크립트가 늦게 로드될 수 있어 약간의 안전장치
if (DATA.comp && DATA.excel && DATA.access) init();
else window.addEventListener('load', init);
