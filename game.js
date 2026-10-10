(() => {
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "perfect-human-save-v2";
  const TYPE_SPEED = 32; // 글자당 ms
  const TIME_SCALE = GAME.timeScale || 1;

  const el = {
    screens: document.querySelectorAll(".screen"),
    boot: $("boot-log"), title: $("game-title"), subtitle: $("game-subtitle"),
    nameForm: $("name-form"), nameInput: $("name-input"), continueBtn: $("continue-btn"),
    chapter: $("chapter-label"), progress: $("progress-bar"), muteBtn: $("mute-btn"),
    status: $("status"), statusToggle: $("status-toggle"), sName: $("status-name"), sId: $("status-id"),
    info: $("status-info"), log: $("status-log"),
    countdown: $("countdown"), countdownTime: $("countdown-time"),
    invTitle: $("inv-title"), inventory: $("inventory"),
    media: $("media-box"), dialogue: $("dialogue"), speaker: $("speaker"), text: $("story-text"), advance: $("advance"),
    quizBox: $("quiz-box"), quizTitle: $("quiz-title"), quizImages: $("quiz-images"), question: $("quiz-question"),
    choices: $("quiz-choices"), form: $("quiz-form"), input: $("quiz-input"), feedback: $("quiz-feedback"),
    tool: $("quiz-tool"), caesarMinus: $("caesar-minus"), caesarPlus: $("caesar-plus"), caesarShift: $("caesar-shift"),
    caesarTop: $("caesar-top"), caesarBottom: $("caesar-bottom"),
    order: $("quiz-order"), orderSlots: $("order-slots"), orderPieces: $("order-pieces"), orderCheck: $("order-check"),
    fields: $("quiz-fields"), fieldsList: $("fields-list"),
    hintBtn: $("hint-btn"), hints: $("quiz-hints"), nextSceneBtn: $("next-scene-btn"),
    endCode: $("end-code"), endTitle: $("end-title"), endText: $("end-text"), endStats: $("end-stats"), restartBtn: $("restart-btn"),
    viewer: $("viewer"), viewerTitle: $("viewer-title"), viewerImages: $("viewer-images"), viewerText: $("viewer-text"), viewerClose: $("viewer-close"),
    flash: $("fx-flash"), bgm: $("bgm"),
  };

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const sceneIndex = (id) => GAME.scenes.findIndex((s) => s.id === id);
  const isEndingScene = (s) => !!s.ending || s.id === GAME.timeoutScene;
  const mainCount = (() => { const i = GAME.scenes.findIndex(isEndingScene); return i < 0 ? GAME.scenes.length : i; })();

  const state = {
    name: GAME.defaultName, scene: 0, line: 0, lineDone: false,
    solved: false, videoDone: true, wrong: 0, hintsUsed: 0, startedAt: 0, muted: false,
    info: clone(GAME.info), log: [], items: [], flags: {}, timer: null, timerOn: false,
    snapshot: null, ended: false,
  };

  // {name} → 이름, {name:아} → 받침에 따라 "아/야"
  const hasBatchim = (ch) => { const c = ch.charCodeAt(0) - 0xac00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
  const fmt = (s) => String(s ?? "")
    .replace(/\{name:(아|야)\}/g, () => state.name + (hasBatchim(state.name.slice(-1)) ? "아" : "야"))
    .replaceAll("{name}", state.name);

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
        case "item":    this.tone(660, .1, { type: "triangle", vol: .05 }); this.tone(990, .2, { type: "triangle", vol: .04, at: .1 }); break;
        case "tick":    this.tone(1200, .05, { type: "square", vol: .012 }); break;
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
        name: state.name, scene: state.scene, wrong: state.wrong, hintsUsed: state.hintsUsed, startedAt: state.startedAt,
        log: state.log, ...state.snapshot,
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
    el.info.innerHTML = "";
    for (const [k, v] of Object.entries(state.info)) {
      if (k === "피험자 번호") continue;
      const dt = document.createElement("dt"), dd = document.createElement("dd");
      dt.textContent = k; dd.textContent = fmt(v);
      if (changed.includes(k)) dd.classList.add("updated");
      if (/불가|위험|치명|감염|SEED|재냉동/.test(v)) dd.classList.add("warn");
      el.info.append(dt, dd);
    }
  }

  function applyInfo(info) {
    if (!info) return;
    Object.assign(state.info, info);
    for (const [k, v] of Object.entries(info)) addLog(`${k}: ${fmt(v)}`);
    renderStatus(Object.keys(info));
  }

  // ════════════════ 소지품 ════════════════
  function renderInventory(fresh) {
    el.inventory.innerHTML = "";
    el.invTitle.hidden = state.items.length === 0;
    state.items.forEach((id) => {
      const item = GAME.items[id];
      if (!item) return;
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "item" + (id === fresh ? " fresh" : "") + (state.flags["seen_" + id] ? "" : " unseen");
      b.textContent = item.name;
      b.addEventListener("click", () => openItem(id));
      li.appendChild(b);
      el.inventory.appendChild(li);
    });
  }

  function giveItem(id) {
    if (!id || state.items.includes(id)) return;
    state.items.push(id);
    sound.sfx("item");
    addLog(`획득: ${GAME.items[id]?.name ?? id}`);
    renderInventory(id);
  }

  function openViewer(title, images, text) {
    el.viewerTitle.textContent = title;
    el.viewerImages.innerHTML = "";
    images.forEach((src) => el.viewerImages.appendChild(makeImg(src, src)));
    el.viewerText.textContent = text;
    el.viewerText.hidden = !text;
    el.viewer.hidden = false;
    el.viewerClose.focus();
  }
  function openItem(id) {
    const item = GAME.items[id];
    if (!item) return;
    state.flags["seen_" + id] = true;
    openViewer(item.name, item.images || [], fmt(item.text));
    renderInventory();
    if (!el.quizBox.hidden) refreshBranch();
  }
  const closeViewer = () => { el.viewer.hidden = true; };
  el.viewerClose.addEventListener("click", closeViewer);
  el.viewer.addEventListener("click", (e) => { if (e.target === el.viewer) closeViewer(); });

  // ════════════════ 출발 카운트다운 ════════════════
  const pad = (n) => String(n).padStart(2, "0");
  function renderTimer() {
    const on = state.timer !== null;
    el.countdown.hidden = !on;
    if (!on) return;
    const t = Math.max(0, Math.ceil(state.timer));
    el.countdownTime.textContent = `${pad(Math.floor(t / 3600))}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`;
    el.countdown.classList.toggle("urgent", t <= 30 * 60 && state.timerOn);
    el.countdown.classList.toggle("stopped", !state.timerOn);
  }
  function applyTimer(t) {
    if (!t) return;
    if (t.set != null) { state.timer = t.set * 60; state.timerOn = true; addLog(`출발까지 ${t.set}분`, true); }
    if (t.cap != null && state.timer !== null) { state.timer = Math.min(state.timer, t.cap * 60); state.timerOn = true; }
    if (t.stop) state.timerOn = false;
    renderTimer();
  }
  setInterval(() => {
    if (!state.timerOn || state.timer === null || state.ended || document.hidden) return;
    if (!$("game-screen").classList.contains("active")) return;
    state.timer -= TIME_SCALE;
    if (state.timer <= 0) {
      state.timer = 0; state.timerOn = false; renderTimer();
      addLog("출발 — 시간 초과", true);
      const bad = sceneIndex(GAME.timeoutScene);
      if (bad >= 0) { closeViewer(); startScene(bad); }
      return;
    }
    if (state.timer <= 5 * 60 && Math.floor(state.timer) % 60 < TIME_SCALE) sound.sfx("tick");
    renderTimer();
  }, 1000);

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
    const ending = isEndingScene(scene);
    if (ending) state.timerOn = false;
    state.snapshot = clone({ info: state.info, items: state.items, flags: state.flags, timer: state.timer, timerOn: state.timerOn });
    if (!ending) save();

    el.chapter.textContent = scene.chapter || `SCENE ${index + 1}`;
    el.progress.style.width = `${Math.min(1, index / mainCount) * 100}%`;
    el.quizBox.hidden = true;
    el.nextSceneBtn.hidden = true;
    renderStatus();
    renderInventory();
    renderTimer();
    if (scene.info) applyInfo(scene.info);

    playMusic(scene.music);
    if (scene.media) renderMedia(scene.media);
    showLine();
  }

  const normLine = (l) => {
    if (typeof l === "string") return { text: l };
    if (l.system) return { ...l, text: l.system, kind: "system" };
    if (l.note) return { ...l, text: l.note, kind: "note" };
    return l;
  };

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
    if (line.media) renderMedia({ type: "image", src: line.media });
    if (line.flag) state.flags[line.flag] = true;
    applyTimer(line.timer);
    giveItem(line.give);

    const last = state.line >= lines.length - 1;
    typeText(fmt(line.text), () => {
      el.advance.hidden = last;
      if (last) onLinesEnd(scene);
    });
  }

  function onLinesEnd(scene) {
    if (!el.nextSceneBtn.hidden || !el.quizBox.hidden) return;
    if (scene.quiz) showQuiz(scene.quiz);
    if (scene.quiz?.type === "branch") return;
    el.nextSceneBtn.hidden = false;
    updateGate();
  }

  function advance() {
    if (!$("game-screen").classList.contains("active") || !el.viewer.hidden) return;
    if (!state.lineDone) { typeText.finish?.(); return; }
    const lines = GAME.scenes[state.scene].lines || [];
    if (state.line < lines.length - 1) { state.line++; showLine(); }
  }
  el.dialogue.addEventListener("click", advance);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !el.viewer.hidden) { closeViewer(); return; }
    if ((e.key === " " || e.key === "Enter") && !/INPUT|BUTTON/.test(e.target.tagName)) { e.preventDefault(); advance(); }
  });

  // ════════════════ 퀴즈 ════════════════
  const normalize = (s) => String(s).replace(/[\s\-–—→>·.,]/g, "").toLowerCase();
  const hintsOf = (quiz) => quiz.hints || (quiz.hint ? [quiz.hint] : []);
  let orderPicked = [];
  let hintIndex = 0;

  function showQuiz(quiz) {
    const type = quiz.type || (quiz.choices ? "choice" : "text");
    el.quizBox.hidden = false;
    el.quizBox.classList.remove("solved");
    el.quizBox.dataset.type = type;
    el.quizTitle.textContent = quiz.title || "LOCKED";
    el.question.textContent = fmt(quiz.question);
    el.feedback.textContent = ""; el.feedback.className = "";

    el.quizImages.innerHTML = "";
    const imgs = quiz.images || (quiz.image ? [quiz.image] : []);
    el.quizImages.dataset.count = imgs.length;
    imgs.forEach((src) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "clue"; b.setAttribute("aria-label", "단서 크게 보기");
      b.appendChild(makeImg(src, src));
      b.addEventListener("click", () => openViewer("단서", [src], ""));
      el.quizImages.appendChild(b);
    });

    hintIndex = 0;
    el.hints.innerHTML = "";
    el.hintBtn.hidden = hintsOf(quiz).length === 0;
    updateHintBtn(quiz);

    el.choices.innerHTML = "";
    el.form.hidden = type !== "text";
    el.order.hidden = type !== "order";
    el.fields.hidden = type !== "fields";
    el.tool.hidden = quiz.tool !== "caesar";
    el.input.value = ""; el.input.disabled = false;
    el.input.inputMode = quiz.numeric ? "numeric" : "text";

    if (quiz.tool === "caesar") { caesar.shift = 0; renderCaesar(); }

    if (type === "choice") {
      quiz.choices.forEach((c) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "btn choice"; b.textContent = c;
        b.addEventListener("click", () => check(c, b));
        el.choices.appendChild(b);
      });
    } else if (type === "branch") {
      refreshBranch();
    } else if (type === "order") {
      orderPicked = [];
      renderOrder(quiz);
    } else if (type === "fields") {
      el.fieldsList.innerHTML = "";
      quiz.fields.forEach((f, i) => {
        const row = document.createElement("label");
        row.className = "field";
        row.htmlFor = "field-" + i;
        const name = document.createElement("span"); name.textContent = f.label;
        const input = document.createElement("input");
        input.id = "field-" + i; input.autocomplete = "off"; input.inputMode = quiz.numeric ? "numeric" : "text";
        const suf = document.createElement("em"); suf.textContent = f.suffix || "";
        row.append(name, input, suf);
        el.fieldsList.appendChild(row);
      });
    } else {
      el.input.focus({ preventScroll: true });
    }
  }

  // 분기 선택지 (조건이 바뀌면 다시 그림)
  function refreshBranch() {
    const quiz = GAME.scenes[state.scene].quiz;
    if (!quiz || quiz.type !== "branch") return;
    el.choices.innerHTML = "";
    quiz.options.forEach((o) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "btn choice";
      const ok = (o.requires || []).every((f) => state.flags[f]);
      b.textContent = o.label + (ok ? "" : " (단서가 부족합니다)");
      b.disabled = !ok;
      b.addEventListener("click", () => choose(o));
      el.choices.appendChild(b);
    });
  }

  function updateHintBtn(quiz) {
    const n = hintsOf(quiz).length;
    el.hintBtn.textContent = hintIndex >= n ? "힌트를 모두 확인했습니다" : `힌트 보기 (${hintIndex + 1}/${n})`;
    el.hintBtn.disabled = hintIndex >= n;
  }
  el.hintBtn.addEventListener("click", () => {
    const quiz = GAME.scenes[state.scene].quiz;
    const hints = hintsOf(quiz);
    if (hintIndex >= hints.length) return;
    const li = document.createElement("li");
    li.textContent = fmt(hints[hintIndex]);
    el.hints.appendChild(li);
    hintIndex++; state.hintsUsed++;
    updateHintBtn(quiz);
  });

  // 순서 맞추기
  function renderOrder(quiz) {
    el.orderSlots.innerHTML = "";
    el.orderPieces.innerHTML = "";
    const pieceById = Object.fromEntries(quiz.pieces.map((p) => [p.id, p]));
    const card = (p) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "piece";
      if (p.img) b.appendChild(makeImg(p.img, p.label));
      const span = document.createElement("span"); span.textContent = p.label; b.appendChild(span);
      return b;
    };
    quiz.answer.forEach((_, i) => {
      const id = orderPicked[i];
      if (id) {
        const b = card(pieceById[id]);
        b.classList.add("in-slot");
        b.setAttribute("aria-label", `${i + 1}번 칸: ${pieceById[id].label} (눌러서 빼기)`);
        b.disabled = state.solved;
        b.addEventListener("click", () => { orderPicked.splice(i, 1); renderOrder(quiz); });
        el.orderSlots.appendChild(b);
      } else {
        const d = document.createElement("div");
        d.className = "slot"; d.textContent = i + 1;
        el.orderSlots.appendChild(d);
      }
    });
    quiz.pieces.forEach((p) => {
      const b = card(p);
      b.disabled = orderPicked.includes(p.id) || state.solved;
      b.addEventListener("click", () => { if (orderPicked.length < quiz.answer.length) { orderPicked.push(p.id); renderOrder(quiz); } });
      el.orderPieces.appendChild(b);
    });
    el.orderCheck.disabled = orderPicked.length < quiz.answer.length || state.solved;
  }
  el.orderCheck.addEventListener("click", () => {
    const quiz = GAME.scenes[state.scene].quiz;
    const ok = orderPicked.join("|") === quiz.answer.join("|");
    if (!ok) orderPicked = [];
    verdict(ok, quiz);
    renderOrder(quiz);
  });

  // 여러 칸 입력
  el.fields.addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.solved) return;
    const quiz = GAME.scenes[state.scene].quiz;
    const vals = quiz.fields.map((_, i) => $("field-" + i).value);
    if (vals.some((v) => !v.trim())) { el.feedback.textContent = "▶ 모든 칸을 입력하십시오."; el.feedback.className = "bad"; return; }
    const ok = vals.every((v, i) => normalize(v) === normalize(quiz.answer[i]));
    verdict(ok, quiz);
    if (ok) el.fieldsList.querySelectorAll("input").forEach((i) => (i.disabled = true));
  });

  // 시저 휠: 아래 줄이 위 줄보다 shift 칸 밀린 알파벳
  const caesar = { shift: 0 };
  const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  function renderCaesar() {
    el.caesarShift.textContent = caesar.shift > 0 ? `+${caesar.shift}` : String(caesar.shift);
    el.caesarTop.innerHTML = ""; el.caesarBottom.innerHTML = "";
    for (let i = 0; i < 26; i++) {
      const a = document.createElement("span"); a.textContent = ABC[i]; el.caesarTop.appendChild(a);
      const b = document.createElement("span"); b.textContent = ABC[(((i + caesar.shift) % 26) + 26) % 26]; el.caesarBottom.appendChild(b);
    }
  }
  const wrapShift = (n) => (n > 13 ? n - 26 : n < -12 ? n + 26 : n);
  el.caesarMinus.addEventListener("click", () => { caesar.shift = wrapShift(caesar.shift - 1); renderCaesar(); });
  el.caesarPlus.addEventListener("click", () => { caesar.shift = wrapShift(caesar.shift + 1); renderCaesar(); });

  function check(value, choiceBtn) {
    if (state.solved) return;
    const quiz = GAME.scenes[state.scene].quiz;
    const ok = [].concat(quiz.answer).map(normalize).includes(normalize(value));
    if (choiceBtn) { choiceBtn.classList.add(ok ? "correct" : "wrong"); if (!ok) choiceBtn.disabled = true; }
    verdict(ok, quiz);
    if (ok) el.choices.querySelectorAll("button").forEach((b) => (b.disabled = true));
  }

  function verdict(ok, quiz) {
    if (ok) {
      state.solved = true;
      sound.sfx("correct");
      el.feedback.textContent = "▶ 승인되었습니다. 잠금이 해제됩니다.";
      el.feedback.className = "ok";
      el.quizBox.classList.add("solved");
      el.quizTitle.textContent = (quiz.title || "LOCKED") + " — 통과";
      el.input.disabled = true;
      el.hintBtn.hidden = true;
      addLog(`${quiz.title || "퀴즈"} 통과`);
      if (quiz.stopTimer) applyTimer({ stop: true });
    } else {
      state.wrong++;
      el.feedback.textContent = "▶ 오류. 응답이 일치하지 않습니다.";
      el.feedback.className = "bad";
      sound.sfx("wrong");
      el.quizBox.classList.remove("shake"); void el.quizBox.offsetWidth; el.quizBox.classList.add("shake");
      addLog(`${quiz.title || "퀴즈"} 실패`, true);
    }
    updateGate();
  }

  el.form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (el.input.value.trim()) check(el.input.value);
  });

  function choose(option) {
    addLog(`선택: ${option.label}`);
    state.timer = null; state.timerOn = false;
    const i = sceneIndex(option.goto);
    if (i >= 0) { startScene(i); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }

  // 퀴즈를 풀고(그리고 필수 영상을 다 본 뒤)에만 다음 장면 버튼이 열림
  function updateGate() {
    const scene = GAME.scenes[state.scene];
    const open = state.solved && state.videoDone;
    el.nextSceneBtn.disabled = !open;
    el.nextSceneBtn.textContent = open
      ? (scene.ending ? "▶ 엔딩" : "▶ 다음으로")
      : (!state.videoDone ? "■ 영상을 끝까지 시청하십시오" : "■ LOCKED — 퀴즈를 풀어야 합니다");
  }

  el.nextSceneBtn.addEventListener("click", () => {
    if (!state.solved || !state.videoDone) return;   // 이중 잠금
    const scene = GAME.scenes[state.scene];
    if (scene.ending) return finish(scene.ending);
    const next = scene.next ? sceneIndex(scene.next) : state.scene + 1;
    if (next >= 0 && next < GAME.scenes.length) {
      startScene(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  // ════════════════ 시작 / 엔딩 ════════════════
  function finish(ending) {
    state.ended = true;
    clearSave();
    clearInterval(typer);
    el.media.querySelector("video")?.pause();
    const sec = Math.round((Date.now() - state.startedAt) / 1000);
    el.endCode.textContent = `${ending.code} ENDING`;
    el.endCode.dataset.code = ending.code;
    el.endTitle.textContent = ending.title;
    el.endText.textContent = fmt(ending.text || "");
    el.endStats.textContent = `피험자 ${state.name} — 플레이 ${Math.floor(sec / 60)}분 ${sec % 60}초 · 오답 ${state.wrong}회 · 힌트 ${state.hintsUsed}회`;
    show("end-screen");
  }

  function begin(saved) {
    sound.init();
    state.ended = false;
    if (saved) {
      Object.assign(state, {
        name: saved.name, wrong: saved.wrong || 0, hintsUsed: saved.hintsUsed || 0, startedAt: saved.startedAt,
        info: saved.info, items: saved.items || [], flags: saved.flags || {}, timer: saved.timer ?? null, timerOn: !!saved.timerOn, log: saved.log || [],
      });
    } else {
      Object.assign(state, { wrong: 0, hintsUsed: 0, startedAt: Date.now(), info: clone(GAME.info), items: [], flags: {}, timer: null, timerOn: false, log: [] });
    }
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
    "> 캡슐 #0007 온도 -196°C ...... 유지",
    "> 생체 신호 ................... 미약",
    "> 외부 대기 오염도 ............ ██ 측정 불가",
  ];
  bootLines.forEach((l, i) => setTimeout(() => { el.boot.textContent += (i ? "\n" : "") + l; }, 400 + i * 450));
})();
