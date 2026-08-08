# @shinkeonkim/clotho-editor

[clotho](../clotho) 애니메이션 문서를 위한 비주얼 에디터.

## 상태

**부트스트랩 단계.** 패키지 골격과 이식 계획만 있다.

기존 에디터(Studio)는 두 블로그 저장소 안에 약 9,000 LOC로 존재하며, 이를 clotho 기반
독립 패키지로 옮기는 것이 이 저장소의 목적이다. 조사와 계획은
[`docs/PORTING.md`](./docs/PORTING.md)에 있다.

조사에서 확인한 핵심 사실 두 가지:

- **의존 경계가 좁다.** Studio가 엔진에서 가져오는 것은 스키마 타입과 런타임 함수뿐이고
  렌더러는 쓰지 않는다. 이식의 대부분은 import 경로 변경이다.
- **미리보기를 clotho로 바꿀 수 있다.** Studio는 자체 캔버스 렌더를 갖고 있어 에디터에서
  맞게 보이는 것이 사이트에서 다르게 보일 수 있었다. `buildScene` + `patchScene`으로
  바꾸면 에디터와 배포본이 같은 렌더 경로를 쓴다.

## 개발

```bash
bun install
bun run typecheck
```

`@shinkeonkim/clotho`가 배포되기 전에는 `package.json`의 의존을
`"file:../clotho"`로 두고 개발한다.

## 라이선스

MIT
