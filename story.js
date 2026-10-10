/*
 * ===== 스토리 설정 파일 =====
 * 이 파일만 고치면 게임 내용을 바꿀 수 있습니다.
 *
 * 장면(scene) 항목 설명
 *   chapter : 상단에 표시될 장면 이름
 *   media   : { type: "image" | "video", src: "파일 경로", poster: "(동영상용) 미리보기 이미지" }
 *             requireWatch: true 이면 동영상을 끝까지 봐야 다음으로 진행 가능
 *   music   : 이 장면에서 반복 재생할 배경음악 (생략하면 이전 음악 유지, null 이면 음악 정지)
 *   lines   : 순서대로 보여줄 대사/나레이션 (클릭으로 넘김)
 *   quiz    : (선택) 모든 대사를 본 뒤 나오는 퀴즈. 맞혀야 다음 장면으로 이동 가능
 *     - question : 문제
 *     - choices  : 객관식 보기 배열 (넣으면 객관식, 빼면 주관식)
 *     - answer   : 정답. 주관식은 여러 개 허용 가능 (배열). 대소문자/띄어쓰기 무시
 *     - hint     : 힌트 (생략 가능)
 */
const GAME = {
  title: "고양이 캐티의 비밀 방",
  subtitle: "사라진 고양이 캐티를 찾아 저택을 탈출하라!",
  ending: "캐티와 함께 무사히 저택을 빠져나왔습니다. 수고하셨어요!",

  scenes: [
    {
      chapter: "프롤로그",
      media: { type: "image", src: "assets/images/scene1.svg" },
      music: "assets/music/theme.mp3",
      lines: [
        "비 오는 밤, 당신은 낡은 저택 앞에 서 있다.",
        "어젯밤 사라진 고양이 '캐티'의 목걸이가 문 앞에 떨어져 있다.",
        "문에는 숫자 자물쇠가 걸려 있다. 목걸이 뒷면에 무언가 적혀 있다…",
      ],
      quiz: {
        question: "목걸이 뒷면: \"고양이의 다리 수 × 목숨의 수\". 자물쇠 번호는?",
        answer: ["36"],
        hint: "고양이는 목숨이 9개라는 말이 있죠.",
      },
    },
    {
      chapter: "1번 방 · 서재",
      media: {
        type: "video",
        src: "assets/videos/scene2.mp4",
        poster: "assets/images/scene2.svg",
        requireWatch: false,
      },
      music: "assets/music/mystery.mp3",
      lines: [
        "문이 열리고 먼지 쌓인 서재가 나타난다.",
        "책상 위 오래된 TV에서 영상이 저절로 재생되기 시작한다.",
        "책장 한 칸만 이상하게 비어 있다. 그 자리에 쪽지가 있다.",
      ],
      quiz: {
        question: "쪽지: \"나는 밤에 눈이 빛나고, 쥐를 쫓으며, '야옹' 하고 운다. 나는 누구?\"",
        choices: ["강아지", "고양이", "부엉이", "여우"],
        answer: "고양이",
        hint: "이 게임의 주인공이에요.",
      },
    },
    {
      chapter: "2번 방 · 음악실",
      media: { type: "image", src: "assets/images/scene3.svg" },
      music: "assets/music/piano.mp3",
      lines: [
        "피아노 소리가 들리는 방으로 들어섰다.",
        "건반 위에 발자국이 찍혀 있다. 캐티가 지나간 것 같다.",
        "벽의 금고에는 영어 단어를 입력하는 화면이 있다.",
      ],
      quiz: {
        question: "금고 화면: \"C _ T\" — 빈칸을 채워 단어를 완성하세요.",
        answer: ["CAT"],
        hint: "모음 하나가 빠졌어요.",
      },
    },
    {
      chapter: "마지막 방 · 다락방",
      media: { type: "image", src: "assets/images/scene4.svg" },
      music: "assets/music/ending.mp3",
      lines: [
        "금고 안에는 다락방 열쇠가 있었다.",
        "다락방 구석, 상자 안에서 캐티가 졸린 눈으로 당신을 바라본다.",
        "출구 문에는 마지막 질문이 새겨져 있다.",
      ],
      quiz: {
        question: "\"이 다락방에 오기까지 지나온 방은 몇 개인가?\"",
        choices: ["1개", "2개", "3개", "4개"],
        answer: "2개",
        hint: "상단의 장면 이름을 떠올려 보세요.",
      },
    },
  ],
};
