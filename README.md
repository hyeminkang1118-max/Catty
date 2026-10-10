# Catty 방탈출 게임

사진·동영상·음악으로 스토리가 진행되고, 각 장면의 퀴즈를 맞혀야 다음 방으로 넘어갈 수 있는 웹 방탈출 게임입니다.
빌드 도구 없이 HTML/CSS/JS만으로 동작합니다.

## 실행

```bash
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000
```

(`index.html`을 더블클릭해도 열리지만, 동영상·음악은 로컬 서버로 여는 편이 안정적입니다.)

## 내 스토리로 바꾸기

1. 파일을 넣습니다.
   - 사진 → `assets/images/`
   - 동영상(mp4 권장) → `assets/videos/`
   - 음악(mp3 권장) → `assets/music/`
2. `story.js`의 `scenes` 배열을 수정합니다. 장면 하나는 이렇게 생겼습니다.

```js
{
  chapter: "1번 방 · 서재",
  media: { type: "video", src: "assets/videos/scene2.mp4", poster: "assets/images/scene2.svg", requireWatch: true },
  music: "assets/music/mystery.mp3",   // 생략하면 이전 음악 유지, null 이면 정지
  lines: ["첫 번째 대사", "두 번째 대사"],
  quiz: {
    question: "문제",
    choices: ["보기1", "보기2"],         // 빼면 주관식
    answer: "보기2",                      // 주관식은 ["정답1", "정답2"] 처럼 여러 개 가능
    hint: "힌트",
  },
}
```

## 동작 규칙

- 대사를 모두 넘기면 퀴즈가 나타나고, **정답을 맞히기 전까지 '다음 방으로' 버튼이 잠겨 있습니다.**
- `requireWatch: true`인 동영상은 끝까지 봐야 버튼이 열립니다.
- 주관식 정답은 대소문자와 띄어쓰기를 무시하고 비교합니다.
- 진행 상황은 브라우저에 자동 저장되어 '이어하기'로 계속할 수 있습니다.
- 파일이 아직 없으면 안내 박스가 대신 표시되고 게임은 그대로 진행됩니다.

> 참고: 정답이 `story.js`에 그대로 들어 있어서, 페이지 소스를 열면 정답을 볼 수 있습니다. 친구들끼리 즐기는 용도라면 문제없지만, 상금이 걸린 대회처럼 엄격해야 한다면 서버에서 정답을 확인하는 방식이 필요합니다.
