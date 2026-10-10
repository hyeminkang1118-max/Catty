(() => {
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "escape-room-save";

  const el = {
    screens: document.querySelectorAll(".screen"),
    title: $("game-title"), subtitle: $("game-subtitle"),
    startBtn: $("start-btn"), continueBtn: $("continue-btn"),
    chapter: $("chapter-label"), progress: $("progress-bar"), muteBtn: $("mute-btn"),
    media: $("media-box"), text: $("story-text"), nextLineBtn: $("next-line-btn"),
    quizBox: $("quiz-box"), question: $("quiz-question"), choices: $("quiz-choices"),
    form: $("quiz-form"), input: $("quiz-input"), feedback: $("quiz-feedback"),
    hintBtn: $("hint-btn"), hint: $("quiz-hint"),
    nextSceneBtn: $("next-scene-btn"),
    endText: $("end-text"), endStats: $("end-stats"), restartBtn: $("restart-btn"),
    bgm: $("bgm"),
  };

  const state = { scene: 0, line: 0, solved: false, videoDone: true, wrong: 0, startedAt: 0, muted: false };

  // ---------- 저장 / 불러오기 ----------
  const save = () => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ scene: state.scene, wrong: state.wrong, startedAt: state.startedAt }));
    } catch {}
  };
  const load = () => {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; }
  };
  const clearSave = () => { try { localStorage.removeItem(SAVE_KEY); } catch {} };

  // ---------- 화면 전환 ----------
  const show = (id) => el.screens.forEach((s) => s.classList.toggle("active", s.id === id));

  // ---------- 음악 ----------
  function playMusic(src) {
    if (src === undefined) return;            // 생략 → 이전 음악 유지
    if (src === null) { el.bgm.pause(); el.bgm.removeAttribute("src"); return; }
    if (el.bgm.getAttribute("src") === src) return;
    el.bgm.src = src;
    el.bgm.muted = state.muted;
    el.bgm.play().catch(() => {});            // 파일이 없어도 게임은 계속 진행
  }

  // ---------- 미디어 (사진/동영상) ----------
  function placeholder(label) {
    const div = document.createElement("div");
    div.className = "placeholder";
    div.textContent = `🖼️ ${label}`;
    return div;
  }

  function renderMedia(media) {
    el.media.innerHTML = "";
    state.videoDone = true;
    if (!media) return;

    if (media.type === "video") {
      const v = document.createElement("video");
      v.src = media.src;
      if (media.poster) v.poster = media.poster;
      v.controls = true;
      v.playsInline = true;
      if (media.requireWatch) {
        state.videoDone = false;
        v.addEventListener("ended", () => { state.videoDone = true; updateGate(); });
      }
      v.addEventListener("error", () => {
        // 동영상 파일이 없으면 포스터 이미지(또는 안내 박스)로 대체하고 시청 조건은 해제
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

  function makeImg(src, label) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.addEventListener("error", () => img.replaceWith(placeholder(label)));
    return img;
  }

  // ---------- 장면 진행 ----------
  function startScene(index) {
    state.scene = index;
    state.line = 0;
    const scene = GAME.scenes[index];
    state.solved = !scene.quiz;
    save();

    el.chapter.textContent = scene.chapter || `장면 ${index + 1}`;
    el.progress.style.width = `${(index / GAME.scenes.length) * 100}%`;
    el.quizBox.hidden = true;
    el.nextSceneBtn.hidden = true;

    playMusic(scene.music);
    renderMedia(scene.media);
    showLine();
  }

  function showLine() {
    const scene = GAME.scenes[state.scene];
    const lines = scene.lines || [];
    el.text.textContent = lines[state.line] || "";
    el.text.classList.remove("fade"); void el.text.offsetWidth; el.text.classList.add("fade");

    const last = state.line >= lines.length - 1;
    el.nextLineBtn.hidden = last;
    if (last) {
      if (scene.quiz) showQuiz(scene.quiz);
      el.nextSceneBtn.hidden = false;
      updateGate();
    }
  }

  el.nextLineBtn.addEventListener("click", () => { state.line++; showLine(); });

  // ---------- 퀴즈 ----------
  const normalize = (s) => String(s).replace(/\s+/g, "").toLowerCase();

  function showQuiz(quiz) {
    el.quizBox.hidden = false;
    el.quizBox.classList.remove("solved");
    el.question.textContent = quiz.question;
    el.feedback.textContent = "";
    el.feedback.className = "";
    el.hint.hidden = true;
    el.hint.textContent = quiz.hint || "";
    el.hintBtn.hidden = !quiz.hint;
    el.input.value = "";
    el.input.disabled = false;
    el.choices.innerHTML = "";

    if (quiz.choices) {
      el.form.hidden = true;
      quiz.choices.forEach((c) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "btn choice";
        b.textContent = c;
        b.addEventListener("click", () => check(c, b));
        el.choices.appendChild(b);
      });
    } else {
      el.form.hidden = false;
      el.input.focus();
    }
  }

  function check(value, choiceBtn) {
    if (state.solved) return;
    const quiz = GAME.scenes[state.scene].quiz;
    const answers = [].concat(quiz.answer).map(normalize);

    if (answers.includes(normalize(value))) {
      state.solved = true;
      el.feedback.textContent = "✅ 정답입니다! 문이 열렸습니다.";
      el.feedback.className = "ok";
      el.quizBox.classList.add("solved");
      choiceBtn?.classList.add("correct");
      el.choices.querySelectorAll("button").forEach((b) => (b.disabled = true));
      el.input.disabled = true;
      el.hintBtn.hidden = true;
    } else {
      state.wrong++;
      save();
      el.feedback.textContent = "❌ 틀렸습니다. 다시 생각해 보세요.";
      el.feedback.className = "bad";
      choiceBtn?.classList.add("wrong");
      el.quizBox.classList.remove("shake"); void el.quizBox.offsetWidth; el.quizBox.classList.add("shake");
    }
    updateGate();
  }

  el.form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (el.input.value.trim()) check(el.input.value);
  });
  el.hintBtn.addEventListener("click", () => { el.hint.hidden = false; });

  // 퀴즈를 풀고(그리고 필수 영상을 다 본 뒤)에만 다음 장면 버튼이 열림
  function updateGate() {
    const open = state.solved && state.videoDone;
    el.nextSceneBtn.disabled = !open;
    el.nextSceneBtn.textContent = open
      ? (state.scene === GAME.scenes.length - 1 ? "🚪 탈출하기" : "🔓 다음 방으로")
      : (!state.videoDone ? "🎬 영상을 끝까지 시청하세요" : "🔒 퀴즈를 풀어야 열립니다");
  }

  el.nextSceneBtn.addEventListener("click", () => {
    if (!state.solved || !state.videoDone) return;   // 이중 잠금
    if (state.scene + 1 < GAME.scenes.length) startScene(state.scene + 1);
    else finish();
  });

  // ---------- 시작 / 엔딩 ----------
  function finish() {
    clearSave();
    el.media.querySelector("video")?.pause();
    const sec = Math.round((Date.now() - state.startedAt) / 1000);
    el.endText.textContent = GAME.ending;
    el.endStats.textContent = `플레이 시간 ${Math.floor(sec / 60)}분 ${sec % 60}초 · 오답 ${state.wrong}회`;
    show("end-screen");
  }

  function begin(fromSave) {
    const saved = fromSave && load();
    state.wrong = saved ? saved.wrong : 0;
    state.startedAt = saved ? saved.startedAt : Date.now();
    show("game-screen");
    startScene(saved ? Math.min(saved.scene, GAME.scenes.length - 1) : 0);
  }

  el.startBtn.addEventListener("click", () => { clearSave(); begin(false); });
  el.continueBtn.addEventListener("click", () => begin(true));
  el.restartBtn.addEventListener("click", () => { el.bgm.pause(); el.bgm.removeAttribute("src"); begin(false); });

  el.muteBtn.addEventListener("click", () => {
    state.muted = !state.muted;
    el.bgm.muted = state.muted;
    el.muteBtn.textContent = state.muted ? "🔇" : "🔊";
  });

  // 초기화
  document.title = GAME.title;
  el.title.textContent = GAME.title;
  el.subtitle.textContent = GAME.subtitle;
  const saved = load();
  el.continueBtn.hidden = !(saved && saved.scene > 0);
})();
