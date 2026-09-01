# @kokoa/clotho-editor

[clotho](../clotho) 애니메이션 문서를 위한 비주얼 에디터.

## 상태

두 블로그 저장소 안에 있던 Studio(약 8,900 LOC)를 clotho
기반 독립 패키지로 옮겼다. typecheck 0 errors, 빌드·테스트 통과.

이식에서 가장 의미 있는 변화는 **미리보기가 clotho를 쓴다**는 점이다. Studio는 자체
캔버스 렌더를 갖고 있어 에디터에서 맞게 보이는 것이 사이트에서 다르게 보일 수 있었다.
이제 `buildScene` + `patchScene`을 지나므로 에디터와 배포본이 갈라질 수 없다.

자세한 내용과 남은 정리 항목은 [`docs/PORTING.md`](./docs/PORTING.md).

## 사용

```bash
npm install @kokoa/clotho @kokoa/clotho-editor react react-dom
# yarn add / pnpm add / bun add 도 같은 패키지 목록을 사용한다.
```

```tsx
import { Studio, configureApi, configureHost } from "@kokoa/clotho-editor";
import "@kokoa/clotho-editor/styles.css";

// 문서가 어디 저장되는지는 호스트가 정한다. 기본값은 원래 Studio가 쓰던 경로다.
configureApi({ baseUrl: "/api/admin/animations" });
configureHost({ placeholderImageUrl: "/uploads/placeholder.png" });

<Studio initial={doc} onSave={handleSave} />;
```

`Studio`는 저장 방식을 호스트가 소유하는 삽입형 컴포넌트다. 기존 API 경로를 그대로 쓰는
완성형 화면이 필요하면 `<StudioMount initialId="document-id" />`를 사용한다. 일반적인
Vite/Next.js/React SPA에 둘 다 삽입할 수 있고, 브라우저 전용 코드는 mount 이후에
초기화된다.

플레이어 설정 패널에서는 caption/chapter list 표시 여부와 단계 목록 위치
(`좌측 | 우측 | 상단 | 하단`)를 편집할 수 있다. 네 레이아웃을 한 화면에서 점검하려면:

```bash
bun run visual-check
```

## 개발

```bash
bun install
bun run typecheck
bun test
bun run build
```

개발 시에는 devDependency가 이웃 `../clotho`를 가리킨다. 배포물에는 이 경로가 포함되지
않고 `^0.1.0` peer 계약만 노출된다. 배포 순서와 검증은
[`../clotho/docs/RELEASING.md`](../clotho/docs/RELEASING.md)를 따른다.

## 라이선스

MIT
