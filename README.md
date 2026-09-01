# @kokoa/clotho-editor

[clotho](../clotho) 애니메이션 문서를 작성하고 미리 볼 수 있는 시각 편집기다.

## 상태

두 블로그 저장소에서 사용하던 Studio 약 8,900줄을 clotho 기반의 독립 패키지로 옮겼다. 타입 검사, 빌드, 테스트를 모두 통과한다.

가장 큰 변화는 **미리보기에도 clotho를 사용한다**는 점이다. 이전 Studio는 자체 canvas renderer를 사용했기 때문에 편집 화면과 실제 사이트의 화면이 다를 수 있었다. 이제 두 화면 모두 `buildScene`과 `patchScene`을 거치므로 같은 문서는 같은 결과로 표시된다.

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

`Studio`는 문서를 저장하는 방법을 사용하는 application에서 정할 수 있는 내장형 컴포넌트다. 기존 API 경로를 그대로 사용하는 완성된 화면이 필요하면 `<StudioMount initialId="document-id" />`를 사용한다. 두 컴포넌트 모두 Vite, Next.js, React SPA에 넣을 수 있으며 브라우저에서만 필요한 코드는 컴포넌트가 화면에 연결된 뒤 초기화된다.

두 에디터의 `JSON 내보내기` 버튼은 현재 문서를 검증한 뒤 `{문서 ID}.json` 파일로 내려받는다. 화면을 직접 만들 때는 `animationDocumentToJson`, `animationDocumentFileName`, `downloadAnimationJson`을 사용할 수 있다.

재생 설정 화면에서는 현재 단계 설명과 전체 단계 목록을 표시할지 선택할 수 있다. 단계 목록의 위치도 `좌측 | 우측 | 상단 | 하단` 중에서 고를 수 있다. 네 가지 배치를 한 화면에서 확인하려면 다음 명령을 실행한다.

```bash
bun run visual-check
```

npm 배포는 `vX.Y.Z` GitHub Release와 `.github/workflows/publish.yml`을 통해 진행한다. 먼저 npm Trusted Publisher와 GitHub의 `npm-production` 승인 environment를 설정해야 한다. 같은 버전의 `@kokoa/clotho`를 먼저 공개한 뒤 editor의 GitHub Release를 공개한다.

## 개발

```bash
bun install
bun run typecheck
bun test
bun run build
```

개발 환경의 devDependency는 이웃한 `../clotho`를 가리킨다. 배포 패키지에는 이 로컬 경로가 들어가지 않으며 `^0.1.0` peer dependency만 공개된다. 배포 순서와 검증 방법은 [`../clotho/docs/RELEASING.md`](../clotho/docs/RELEASING.md)에 정리되어 있다.

## Cloudflare Workers 배포

독립 에디터는 `app`에서 시작하며 Cloudflare Workers Static Assets용 설정은 [`wrangler.jsonc`](./wrangler.jsonc)에 들어 있다. 로컬에서 실제 화면을 확인하거나 배포 파일을 만들려면 다음 명령을 사용한다.

```bash
bun run app:dev
bun run app:build
bun run worker:dev
```

실제 배포가 필요할 때만 `bun run worker:deploy`를 실행한다. 이 저장소의 설정에는 custom domain을 넣지 않았으므로 Cloudflare Dashboard의 해당 Worker에서 `clotho-editor.shinkeonkim.com`을 Custom Domain으로 연결하면 된다. Dashboard에서 관리한 설정이 이후 CLI 배포로 덮어써지지 않도록 `routes` 항목도 두지 않았다.

## 라이선스

MIT
