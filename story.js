/*
 * ===== 스토리 설정 파일 =====
 * 이 파일만 고치면 게임 내용을 바꿀 수 있습니다.
 *
 * 대사 안의 {name} 은 플레이어가 입력한 이름으로 바뀝니다.
 *
 * ── 장면(scene) ──────────────────────────────
 *   chapter : 상단에 표시될 장면 이름
 *   info    : 상태창 정보 변경 (예: { 일시: "2060.11.02", 위치: "제3 실험실" })
 *   media   : { type: "image" | "video", src, poster, requireWatch }
 *             requireWatch: true → 동영상을 끝까지 봐야 다음으로 진행
 *   music   : 배경음악 경로 (생략 → 이전 음악 유지, null → 정지)
 *             파일이 없으면 으스스한 기본 배경음이 자동으로 재생됩니다.
 *   lines   : 대사 목록 (아래 참고)
 *   quiz    : 모든 대사가 끝난 뒤 나오는 퀴즈. 맞혀야 다음 장면으로 이동 가능
 *
 * ── 대사(lines) 쓰는 법 ─────────────────────
 *   "문자열"                                → 나레이션
 *   { speaker: "연구원", text: "..." }      → 인물 대사
 *   { system: "..." }                       → 시스템 메시지 (상태창 알림 스타일)
 *   어떤 대사에든 아래 옵션을 붙일 수 있습니다.
 *     stats  : { mind: -10 }   → 능력치 증감 (+/-)
 *     info   : { 상태: "..." } → 상태창 정보 변경
 *     effect : "shake" | "glitch" | "flash" | "alarm"  → 화면 연출
 *
 * ── 퀴즈(quiz) ──────────────────────────────
 *   title    : 퀴즈 창 제목
 *   question : 문제
 *   choices  : 객관식 보기 (빼면 주관식)
 *   answer   : 정답 (주관식은 배열로 여러 개 허용, 대소문자/띄어쓰기 무시)
 *   hint     : 힌트
 *   penalty  : 오답 시 능력치 변화 (생략하면 rules.wrongPenalty)
 */
const GAME = {
  title: "PERFECT HUMAN",
  subtitle: "2060년, 대한민국. 30년의 잠에서 깨어난 당신에게 남은 것은…",
  defaultName: "피험자",
  ending: "— 다음 이야기에 계속 —",

  // 게임 규칙
  rules: {
    wrongPenalty: { mind: -5 },  // 오답 시
    hintCost: { mind: -3 },      // 힌트를 볼 때
    gameOverStat: "mind",        // 이 능력치가 0이 되면 게임 오버 (장면 처음부터 다시). 끄려면 null
  },

  // 상태창 능력치 (막대 그래프)
  stats: {
    hp:     { label: "체력",   value: 35, max: 100 },
    mind:   { label: "정신력", value: 80, max: 100 },
    infect: { label: "감염도", value: 0,  max: 100, danger: true }, // danger: 높을수록 위험(빨강)
  },

  // 상태창 정보 (처음 값)
  info: {
    "피험자 번호": "PH-2030-0417",
    일시: "-",
    위치: "-",
    상태: "-",
    칭호: "없음",
  },

  scenes: [
    // ───────────────────────── 프롤로그 ─────────────────────────
    {
      chapter: "PROLOGUE",
      info: { 일시: "2030.03.14", 위치: "퍼펙트 휴먼 냉동 센터", 상태: "희귀 난치병 (치료 불가)" },
      media: { type: "image", src: "assets/images/scene1.svg" },
      music: "assets/music/prologue.mp3",
      lines: [
        "2030년, 대한민국.",
        "나는 당시 현대 의학으로는 고칠 수 없는 희귀 난치병에 걸려 있었다.",
        "그런 내게 냉동 인간을 연구하는 세계적 기업이 손을 내밀었다.",
        { system: "[PERFECT HUMAN PROJECT]\n피험자 {name} — 무상 참여 승인", effect: "flash" },
        { text: "치료법이 존재하는 미래에 깨어나기를 바라며, 나는 차가운 캡슐 속에서 눈을 감았다.", info: { 상태: "냉동 수면" } },
      ],
    },

    // ───────────────────────── 1장 · 각성 ─────────────────────────
    {
      chapter: "CHAPTER 1 · 각성",
      info: { 일시: "2060.11.02", 위치: "제3 실험실", 상태: "해동 직후 · 의식 혼미" },
      media: { type: "image", src: "assets/images/scene2.svg" },
      music: "assets/music/awakening.mp3",
      lines: [
        { system: "[SYSTEM] 해동 프로세스 완료\n경과 시간: 30년 7개월 19일", effect: "alarm", stats: { hp: -10 } },
        { text: "…시끄러운 소리에 눈을 떠보니, 눈앞에 낯선 사람이 있다.", effect: "shake" },
        { speaker: "연구원", text: "{name}님, 정신이 드세요?" },
        { speaker: "연구원", text: "박사님! {name}님이 깨어났어요!" },
        "연구원복을 입은 여자는 다급하게 실험실 밖으로 달려나갔다.",
        { system: "[SYSTEM] 해동 후 인지 기능 검사를 시작합니다." },
      ],
      // ※ 임시 퀴즈 — 원하는 문제로 바꿔 주세요
      quiz: {
        title: "인지 기능 검사 01",
        question: "피험자가 냉동 수면에 들어간 연도를 입력하십시오.",
        answer: ["2030", "2030년"],
        hint: "프롤로그의 첫 문장을 떠올려 보세요.",
      },
    },

    // ───────────────────────── 2장 · 2060 ─────────────────────────
    {
      chapter: "CHAPTER 2 · 2060",
      info: { 상태: "의식 회복" },
      media: { type: "image", src: "assets/images/scene3.svg" },
      lines: [
        { text: "무사히 깨어난 것에 안도한 것도 잠시, 나는 정신을 차리고 여자에게 상황 설명을 들었다.", stats: { hp: +5 } },
        { speaker: "연구원", text: "애석하게도 2060년 지구는 완전히 인간이 살 수 없는 행성이 되었어요.", effect: "glitch", stats: { mind: -10 } },
        { speaker: "연구원", text: "아시다시피 {name}님이 깨어있을 때부터 지속되던 지구 온난화 및 환경 오염으로 인해 생태계가 완전히 파괴되었고," },
        { speaker: "연구원", text: "알 수 없는 전염병이 돌게 되었죠.", info: { "외부 환경": "생존 불가" } },
        { speaker: "연구원", text: "인간들의 개체수는 거의 1/100으로 줄었고, 남아있는 인간들도 심각한 병에 시달리고 있죠.", effect: "glitch", stats: { mind: -10 } },
        { speaker: "연구원", text: "아이러니하게도 그런 상황에서 안전했던 건 몸을 캡슐 속에 얼려놓은 우리 '퍼펙트 휴먼'들 뿐이에요." },
        { speaker: "연구원", text: "그리고 우리는 이제 이 망가진 지구에서 인류의 명맥을 이어야 하죠.", effect: "flash" },
        { system: "[SYSTEM] 칭호 획득: 「인류의 마지막 표본」", info: { 칭호: "인류의 마지막 표본" } },
      ],
      // ※ 임시 퀴즈 — 원하는 문제로 바꿔 주세요
      quiz: {
        title: "인지 기능 검사 02",
        question: "2060년 현재, 인간의 개체수는 이전의 약 몇 분의 1로 줄었습니까?",
        choices: ["1/10", "1/50", "1/100", "1/1000"],
        answer: "1/100",
        hint: "연구원의 설명을 다시 떠올려 보세요.",
      },
    },
  ],
};
