(() => {
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "perfect-human-save";
  const TYPE_SPEED = 32; // 글자당 ms
  const rules = GAME.rules || {};

  const el = {
    screens: document.querySelectorAll(".screen"),
    boot: $("boot-log"), title: $("game-title"), subtitle: $("game-subtitle"),
    nameForm: $("name-form"), nameInput: $("name-input"), continueBtn: $("continue-btn"),
    chapter: $("chapter-label"), progress: $("progress-bar"), muteBtn: $("mute-btn"),
    status: $("status"), statusToggle: $("status-toggle"), sName: $("status-name"), sId: $("status-id"),
    bars: $("status-bars"), info: $("status-info"), log: $("status-log"),
    media: $("media-box"), dialogue: $("dialogue"), speaker: $("speaker"), text: $("story-text"), advance: $("advance"),
    quizBox: $("quiz-box"), quizTitle: $("quiz-title"), question: $("quiz-question"), choices: $("quiz-choices"),
    form: $("quiz-form"), input: $("quiz-input"), feedback: $("quiz-feedback"),
    hintBtn: $("hint-btn"), hint: $("quiz-hint"), nextSceneBtn: $("next-scene-btn"),
    endTitle: $("end-title"), endText: $("end-text"), endStats: $("end-stats"), restartBtn: $("restart-btn"),
    gameover: $("gameover"), retryBtn: $("retry-btn"),
    toasts: $("toasts"), flash: $("fx-flash"), bgm: $("bgm"),
  };

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const initialStats = () => Object.fromEntries(Object.entries(GAME.stats).map(([k, s]) => [k, s.value]));

  const state = {
    name: GAME.defaultName, scene: 0, line: 0, lineDone: false,
    solved: false, videoDone: true, wrong: 0, startedAt: 0, muted: false, over: false,
    stats: initialStats(), info: clone(GAME.info), log: [], snapshot: null,
  };

  const fmt = (s) => String(s ?? "").replaceAll("{name}", state.name);

  // ════════════════ 사운드 (음악 파일이 없을 때 쓰는 기본 효과음/배경음) ════════════════
  const sound = {
    ctx: null, master: null, drone: null,
    init() {
      if (this.ctx) return;
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = state.muted ? 0 : 1;
        this.master.connect(this.ctx.destination);
      } catch { this.ctx = null; }
    },
    setMuted(m) { if (this.master) this.master.gain.value = m ? 0 : 1; },
    tone(freq, dur, { type = "sine", vol = 0.05, at = 0 } = {}) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + at;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.master);
      o.start(t); o.stop(t + dur + 0.05);
    },
    noise(dur = 0.25, vol = 0.08) {
      if (!this.ctx) return;
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
      src.buffer = buf; g.gain.value = vol;
      src.connect(g).connect(this.master); src.start();
    },
    sfx(name) {
      switch (name) {
        case "system":  this.tone(880, .08, { type: "square", vol: .025 }); this.tone(1320, .12, { type: "square", vol: .02, at: .09 }); break;
        case "alarm":   for (let i = 0; i < 3; i++) { this.tone(620, .22, { type: "sawtooth", vol: .03, at: i * .5 }); this.tone(460, .22, { type: "sawtooth", vol: .03, at: i * .5 + .25 }); } break;
        case "glitch":  this.noise(.3, .07); this.tone(70, .3, { type: "sawtooth", vol: .05 }); break;
        case "shake":   this.tone(45, .5, { type: "sine", vol: .2 }); break;
        case "flash":   this.tone(1760, .6, { type: "sine", vol: .02 }); break;
        case "wrong":   this.tone(98, .35, { type: "sawtooth", vol: .06 }); this.tone(92, .35, { type: "square", vol: .03 }); break;
        case "correct": this.tone(523, .15, { vol: .05 }); this.tone(784, .4, { vol: .05, at: .12 }); break;
        case "damage":  this.tone(160, .2, { type: "triangle", vol: .06 }); break;
      }
    },
    // 낮게 웅웅거리는 불길한 배경음
    startDrone() {
      if (!this.ctx || this.drone) return;
      const c = this.ctx, out = c.createGain(), filter = c.createBiquadFilter();
      filter.type = "lowpass"; filter.frequency.value = 220; filter.Q.value = 8;
      out.gain.setValueAtTime(0, c.currentTime);
      out.gain.linearRampToValueAtTime(0.06, c.currentTime + 4);
      const oscs = [[55, "sawtooth"], [55.6, "sawtooth"], [27.5, "sine"], [82.4, "triangle"]].map(([f, t]) => {
        const o = c.createOscillator(); o.type = t; o.frequency.value = f; o.connect(filter); o.start(); return o;
      });
      const lfo = c.createOscillator(), lfoGain = c.createGain();
      lfo.frequency.value = 0.06; lfoGain.gain.value = 120;
      lfo.connect(lfoGain).connect(filter.frequency); lfo.start();
      filter.connect(out).connect(this.master);
      this.drone = { out, nodes: [...oscs, lfo] };
    },
    stopDrone() {
      if (!this.drone) return;
      const { out, nodes } = this.drone, t = this.ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0, t + 1.5);
      nodes.forEach((n) => n.stop(t + 1.6));
      this.drone = null;
    },
  };

  // ════════════════ 음악 ════════════════
  el.bgm.addEventListener("error", () => { if (el.bgm.getAttribute("src")) sound.startDrone(); });
  el.bgm.addEventListener("playing", () => sound.stopDrone());

  function playMusic(src) {
    if (src === undefined) {                 // 생략 → 이전 음악 유지 (처음이면 기본 배경음)
      if (!el.bgm.getAttribute("src")) sound.startDrone();
      return;
    }
    if (src === null) { el.bgm.pause(); el.bgm.removeAttribute("src"); sound.stopDrone(); return; }
    if (el.bgm.getAttribute("src") === src) return;
    el.bgm.src = src;
    el.bgm.muted = state.muted;
    el.bgm.play().catch(() => {});
  }

  // ════════════════ 저장 ════════════════
  const save = () => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        name: state.name, scene: state.scene, wrong: state.wrong, startedAt: state.startedAt,
        stats: state.snapshot.stats, info: state.snapshot.info, log: state.log,
      }));
    } catch {}
  };
  const load = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; } };
  const clearSave = () => { try { localStorage.removeItem(SAVE_KEY); } catch {} };

  const show = (id) => el.screens.forEach((s) => s.classList.toggle("active", s.id === id));

  // ════════════════ 연출 ════════════════
  function effect(name) {
    if (!name) return;
    sound.sfx(name);
    if (name === "shake" || name === "glitch") {
      document.body.classList.remove(name); void document.body.offsetWidth;
      document.body.classList.add(name);
      setTimeout(() => document.body.classList.remove(name), 1000);
    }
    if (name === "flash" || name === "alarm" || name === "glitch") {
      el.flash.classList.remove("on", "red"); void el.flash.offsetWidth;
      if (name !== "flash") el.flash.classList.add("red");
      el.flash.classList.add("on");
    }
  }

  function toast(text, bad = false) {
    const t = document.createElement("div");
    t.className = "toast" + (bad ? " bad" : "");
    t.textContent = text;
    el.toasts.appendChild(t);
    setTimeout(() => t.remove(), 2700);
  }

  function addLog(text, bad = false) {
    const time = new Date().toTimeString().slice(0, 8);
    state.log.unshift({ text: `${time} ${text}`, bad });
    state.log = state.log.slice(0, 8);
    renderLog();
  }
  function renderLog() {
    el.log.innerHTML = "";
    state.log.forEach((l) => {
      const li = document.createElement("li");
      li.textContent = l.text;
      if (l.bad) li.className = "bad";
      el.log.appendChild(li);
    });
  }

  // ════════════════ 상태창 ════════════════
  function renderStatus(changed = []) {
    el.sName.textContent = state.name;
    el.sId.textContent = state.info["피험자 번호"] || "";

    el.bars.innerHTML = "";
    for (const [key, def] of Object.entries(GAME.stats)) {
      const v = state.stats[key], pct = Math.round((v / def.max) * 100);
      const row = document.createElement("div");
      row.className = "bar-row" + (changed.includes(key) ? " changed" : "");
      const fillClass = def.danger ? (pct >= 50 ? "danger" : "") : (pct <= 25 ? "low" : "");
      row.innerHTML = `<span class="bar-label"></span><div class="bar"><div class="bar-fill ${fillClass}"></div></div><span class="bar-val">${v}/${def.max}</span>`;
      row.querySelector(".bar-label").textContent = def.label;
      el.bars.appendChild(row);
      const fill = row.querySelector(".bar-fill");
      const prev = renderStatus.prev?.[key] ?? pct;
      fill.style.width = prev + "%";
      requestAnimationFrame(() => requestAnimationFrame(() => (fill.style.width = pct + "%")));
    }
    renderStatus.prev = Object.fromEntries(Object.entries(GAME.stats).map(([k, d]) => [k, Math.round((state.stats[k] / d.max) * 100)]));

    el.info.innerHTML = "";
    for (const [k, v] of Object.entries(state.info)) {
      if (k === "피험자 번호") continue;
      const dt = document.createElement("dt"), dd = document.createElement("dd");
      dt.textContent = k; dd.textContent = fmt(v);
      if (changed.includes(k)) dd.classList.add("updated");
      if (/불가|위험|치명|감염/.test(v)) dd.classList.add("warn");
      el.info.append(dt, dd);
    }
  }

  function applyStats(delta, reason) {
    if (!delta) return;
    const changed = [];
    let hurt = false;
    for (const [key, d] of Object.entries(delta)) {
      const def = GAME.stats[key];
      if (!def || !d) continue;
      state.stats[key] = Math.max(0, Math.min(def.max, state.stats[key] + d));
      changed.push(key);
      const bad = def.danger ? d > 0 : d < 0;
      hurt ||= bad;
      const msg = `${def.label} ${d > 0 ? "+" : ""}${d}`;
      toast(msg, bad);
      addLog(reason ? `${reason} · ${msg}` : msg, bad);
    }
    if (hurt) {
      sound.sfx("damage");
      el.status.classList.remove("hit"); void el.status.offsetWidth; el.status.classList.add("hit");
    }
    renderStatus(changed);
    checkGameOver();
  }

  function applyInfo(info) {
    if (!info) return;
    Object.assign(state.info, info);
    for (const [k, v] of Object.entries(info)) addLog(`${k}: ${fmt(v)}`);
    renderStatus(Object.keys(info));
  }

  function checkGameOver() {
    const key = rules.gameOverStat;
    if (!key || state.over || state.stats[key] > 0) return;
    state.over = true;
    setTimeout(() => { el.gameover.hidden = false; effect("glitch"); }, 600);
  }

  el.retryBtn.addEventListener("click", () => {
    el.gameover.hidden = true;
    state.over = false;
    state.stats = clone(state.snapshot.stats);
    state.info = clone(state.snapshot.info);
    addLog("장면 재시작", true);
    startScene(state.scene);
  });

  // ════════════════ 미디어 ════════════════
  function placeholder(label) {
    const div = document.createElement("div");
    div.className = "placeholder";
    div.textContent = `[ NO SIGNAL ] ${label}`;
    return div;
  }
  function makeImg(src, label) {
    const img = document.createElement("img");
    img.src = src; img.alt = "";
    img.addEventListener("error", () => img.replaceWith(placeholder(label)));
    return img;
  }
  function renderMedia(media) {
    el.media.innerHTML = "";
    state.videoDone = true;
    if (!media) return;
    if (media.type === "video") {
      const v = document.createElement("video");
      v.src = media.src; v.controls = true; v.playsInline = true;
      if (media.poster) v.poster = media.poster;
      if (media.requireWatch) {
        state.videoDone = false;
        v.addEventListener("ended", () => { state.videoDone = true; updateGate(); });
      }
      v.addEventListener("error", () => {   // 영상 파일이 없으면 포스터로 대체, 시청 조건 해제
        state.videoDone = true;
        el.media.innerHTML = "";
        el.media.appendChild(media.poster ? makeImg(media.poster, media.src) : placeholder(media.src));
        updateGate();
      });
      el.media.appendChild(v);
      v.play().catch(() => {});
    } else {
      el.media.appendChild(makeImg(media.src, media.src));
    }
  }

  // ════════════════ 장면 / 대사 ════════════════
  function startScene(index) {
    state.scene = index;
    state.line = 0;
    const scene = GAME.scenes[index];
    state.solved = !scene.quiz;
    state.snapshot = { stats: clone(state.stats), info: clone(state.info) };
    save();

    el.chapter.textContent = scene.chapter || `SCENE ${index + 1}`;
    el.progress.style.width = `${(index / GAME.scenes.length) * 100}%`;
    el.quizBox.hidden = true;
    el.nextSceneBtn.hidden = true;
    renderStatus();
    if (scene.info) applyInfo(scene.info);

    playMusic(scene.music);
    renderMedia(scene.media);
    showLine();
  }

  const normLine = (l) => (typeof l === "string" ? { text: l } : l.system ? { ...l, text: l.system, kind: "system" } : l);

  let typer = null;
  function typeText(text, done) {
    clearInterval(typer);
    let i = 0;
    el.text.textContent = "";
    state.lineDone = false;
    el.advance.hidden = true;
    const finish = () => { clearInterval(typer); typer = null; el.text.textContent = text; state.lineDone = true; done(); };
    typer = setInterval(() => { i++; el.text.textContent = text.slice(0, i); if (i >= text.length) finish(); }, TYPE_SPEED);
    typeText.finish = finish;
  }

  function showLine() {
    const scene = GAME.scenes[state.scene];
    const lines = scene.lines || [];
    const line = normLine(lines[state.line] || "");
    const kind = line.kind || (line.speaker ? "speech" : "narration");

    el.dialogue.className = "dialogue " + kind;
    el.speaker.hidden = !line.speaker;
    el.speaker.textContent = fmt(line.speaker);
    if (kind === "system") { sound.sfx("system"); addLog(fmt(line.text).split("\n")[0]); }

    effect(line.effect);
    applyInfo(line.info);
    applyStats(line.stats);

    const last = state.line >= lines.length - 1;
    typeText(fmt(line.text), () => {
      el.advance.hidden = last;
      if (last) onLinesEnd(scene);
    });
  }

  function onLinesEnd(scene) {
    if (!el.nextSceneBtn.hidden) return;
    if (scene.quiz) showQuiz(scene.quiz);
    el.nextSceneBtn.hidden = false;
    updateGate();
  }

  function advance() {
    if (state.over || !$("game-screen").classList.contains("active")) return;
    if (!state.lineDone) { typeText.finish?.(); return; }
    const lines = GAME.scenes[state.scene].lines || [];
    if (state.line < lines.length - 1) { state.line++; showLine(); }
  }
  el.dialogue.addEventListener("click", advance);
  document.addEventListener("keydown", (e) => {
    if ((e.key === " " || e.key === "Enter") && !/INPUT|BUTTON/.test(e.target.tagName)) { e.preventDefault(); advance(); }
  });

  // ════════════════ 퀴즈 ════════════════
  const normalize = (s) => String(s).replace(/\s+/g, "").toLowerCase();

  function showQuiz(quiz) {
    el.quizBox.hidden = false;
    el.quizBox.classList.remove("solved");
    el.quizTitle.textContent = quiz.title || "LOCKED";
    el.question.textContent = fmt(quiz.question);
    el.feedback.textContent = ""; el.feedback.className = "";
    el.hint.hidden = true; el.hint.textContent = fmt(quiz.hint);
    el.hintBtn.hidden = !quiz.hint;
    el.hintBtn.disabled = false;
    el.hintBtn.textContent = "힌트 보기" + (rules.hintCost ? " (" + costText(rules.hintCost) + ")" : "");
    el.input.value = ""; el.input.disabled = false;
    el.choices.innerHTML = "";

    if (quiz.choices) {
      el.form.hidden = true;
      quiz.choices.forEach((c) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "btn choice"; b.textContent = c;
        b.addEventListener("click", () => check(c, b));
        el.choices.appendChild(b);
      });
    } else {
      el.form.hidden = false;
      el.input.focus({ preventScroll: true });
    }
  }

  const costText = (d) => Object.entries(d).map(([k, v]) => `${GAME.stats[k]?.label ?? k} ${v > 0 ? "+" : ""}${v}`).join(", ");

  function check(value, choiceBtn) {
    if (state.solved || state.over) return;
    const quiz = GAME.scenes[state.scene].quiz;
    const answers = [].concat(quiz.answer).map(normalize);

    if (answers.includes(normalize(value))) {
      state.solved = true;
      sound.sfx("correct");
      el.feedback.textContent = "▶ 승인되었습니다. 잠금이 해제됩니다.";
      el.feedback.className = "ok";
      el.quizBox.classList.add("solved");
      el.quizTitle.textContent = (quiz.title || "LOCKED") + " — 통과";
      choiceBtn?.classList.add("correct");
      el.choices.querySelectorAll("button").forEach((b) => (b.disabled = true));
      el.input.disabled = true;
      el.hintBtn.hidden = true;
      addLog(`${quiz.title || "퀴즈"} 통과`);
      if (quiz.reward) applyStats(quiz.reward, "보상");
    } else {
      state.wrong++;
      el.feedback.textContent = "▶ 오류. 응답이 일치하지 않습니다.";
      el.feedback.className = "bad";
      choiceBtn?.classList.add("wrong");
      if (choiceBtn) choiceBtn.disabled = true;
      sound.sfx("wrong");
      el.quizBox.classList.remove("shake"); void el.quizBox.offsetWidth; el.quizBox.classList.add("shake");
      applyStats(quiz.penalty || rules.wrongPenalty, "오답");
    }
    updateGate();
  }

  el.form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (el.input.value.trim()) check(el.input.value);
  });
  el.hintBtn.addEventListener("click", () => {
    el.hint.hidden = false;
    el.hintBtn.disabled = true;
    applyStats(rules.hintCost, "힌트");
  });

  // 퀴즈를 풀고(그리고 필수 영상을 다 본 뒤)에만 다음 장면 버튼이 열림
  function updateGate() {
    const open = state.solved && state.videoDone;
    const last = state.scene === GAME.scenes.length - 1;
    el.nextSceneBtn.disabled = !open;
    el.nextSceneBtn.textContent = open
      ? (last ? "▶ 기록 종료" : "▶ 다음으로")
      : (!state.videoDone ? "■ 영상을 끝까지 시청하십시오" : "■ LOCKED — 검사를 통과해야 합니다");
  }

  el.nextSceneBtn.addEventListener("click", () => {
    if (!state.solved || !state.videoDone || state.over) return;   // 이중 잠금
    if (state.scene + 1 < GAME.scenes.length) {
      startScene(state.scene + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else finish();
  });

  // ════════════════ 시작 / 엔딩 ════════════════
  function finish() {
    clearSave();
    clearInterval(typer);
    el.media.querySelector("video")?.pause();
    const sec = Math.round((Date.now() - state.startedAt) / 1000);
    el.endTitle.textContent = GAME.title;
    el.endText.textContent = fmt(GAME.ending);
    const statsText = Object.entries(GAME.stats).map(([k, d]) => `${d.label} ${state.stats[k]}`).join(" · ");
    el.endStats.textContent = `피험자 ${state.name} — 경과 ${Math.floor(sec / 60)}분 ${sec % 60}초 · 오답 ${state.wrong}회 · ${statsText}`;
    show("end-screen");
  }

  function begin(saved) {
    sound.init();
    state.over = false;
    el.gameover.hidden = true;
    if (saved) {
      Object.assign(state, { name: saved.name, wrong: saved.wrong, startedAt: saved.startedAt, stats: saved.stats, info: saved.info, log: saved.log || [] });
    } else {
      Object.assign(state, { wrong: 0, startedAt: Date.now(), stats: initialStats(), info: clone(GAME.info), log: [] });
    }
    renderStatus.prev = null;
    renderLog();
    show("game-screen");
    startScene(saved ? Math.min(saved.scene, GAME.scenes.length - 1) : 0);
  }

  el.nameForm.addEventListener("submit", (e) => {
    e.preventDefault();
    clearSave();
    state.name = el.nameInput.value.trim() || GAME.defaultName;
    begin(null);
  });
  el.continueBtn.addEventListener("click", () => { const s = load(); if (s) begin(s); });
  el.restartBtn.addEventListener("click", () => {
    el.bgm.pause(); el.bgm.removeAttribute("src"); sound.stopDrone();
    el.nameInput.value = "";
    el.continueBtn.hidden = true;
    show("start-screen");
  });

  el.muteBtn.addEventListener("click", () => {
    state.muted = !state.muted;
    el.bgm.muted = state.muted;
    sound.setMuted(state.muted);
    el.muteBtn.textContent = state.muted ? "🔇" : "🔊";
  });

  el.statusToggle.addEventListener("click", () => {
    if (window.matchMedia("(max-width: 820px)").matches) el.status.classList.toggle("collapsed");
  });

  // ════════════════ 초기화 ════════════════
  document.title = GAME.title;
  el.title.textContent = GAME.title;
  el.subtitle.textContent = GAME.subtitle;
  if (window.matchMedia("(max-width: 820px)").matches) el.status.classList.add("collapsed");
  const saved = load();
  el.continueBtn.hidden = !(saved && saved.scene > 0);

  // 부팅 로그 연출
  const bootLines = [
    "> CRYO-SYS v4.2.1 ............ OK",
    "> 캡슐 #0417 온도 -196°C ...... 유지",
    "> 생체 신호 ................... 미약",
    "> 외부 대기 오염도 ............ ██ 측정 불가",
  ];
  bootLines.forEach((l, i) => setTimeout(() => { el.boot.textContent += (i ? "\n" : "") + l; }, 400 + i * 450));
})();
