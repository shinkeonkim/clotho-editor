# @shinkeonkim/clotho-editor

[clotho](../clotho) 애니메이션 문서를 위한 비주얼 에디터.

## 상태

**이식 완료, 정리 진행 중.** 두 블로그 저장소 안에 있던 Studio(약 8,900 LOC)를 clotho
기반 독립 패키지로 옮겼다. typecheck 0 errors, 빌드·테스트 통과.

이식에서 가장 의미 있는 변화는 **미리보기가 clotho를 쓴다**는 점이다. Studio는 자체
캔버스 렌더를 갖고 있어 에디터에서 맞게 보이는 것이 사이트에서 다르게 보일 수 있었다.
이제 `buildScene` + `patchScene`을 지나므로 에디터와 배포본이 갈라질 수 없다.

자세한 내용과 남은 정리 항목은 [`docs/PORTING.md`](./docs/PORTING.md).

## 사용

```tsx
import { Studio, configureApi, configureHost } from '@shinkeonkim/clotho-editor';
import '@shinkeonkim/clotho-editor/styles.css';

// 문서가 어디 저장되는지는 호스트가 정한다. 기본값은 원래 Studio가 쓰던 경로다.
configureApi({ baseUrl: '/api/admin/animations' });
configureHost({ placeholderImageUrl: '/uploads/placeholder.png' });

<Studio initial={doc} onSave={handleSave} />;
```

## 개발

```bash
bun install
bun run typecheck
bun test
bun run build
```

`@shinkeonkim/clotho`가 배포되기 전에는 `package.json`의 의존을
`"file:../clotho"`로 두고 개발한다.

## 라이선스

MIT
