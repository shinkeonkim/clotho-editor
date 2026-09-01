# @kokoa/clotho-editor

`@kokoa/clotho-editor`는 [Clotho](https://github.com/shinkeonkim/clotho) 애니메이션 문서를 만드는 React 기반 시각 편집기입니다. 저장소, 이미지 업로드, 예제 목록과 저장 동작을 host application에서 주입할 수 있으므로 독립형 편집기와 기존 관리 화면에서 같은 package를 사용할 수 있습니다.

실제 화면은 [Clotho Editor](https://clotho-editor.shinkeonkim.com/)에서 확인할 수 있습니다.

## 설치

```bash
npm install @kokoa/clotho @kokoa/clotho-editor react react-dom
```

```tsx
import {
  StudioMount,
  createLocalStorageRepository,
} from "@kokoa/clotho-editor";
import "@kokoa/clotho/styles.css";
import "@kokoa/clotho-editor/styles.css";

const repository = createLocalStorageRepository({
  storageKey: "my-app.animations",
  examples,
});

export function AnimationEditor() {
  return <StudioMount editorTitle="Clotho Editor" repository={repository} />;
}
```

`StudioMount`는 목록 조회, 새 문서 생성, 저장, 삭제와 JSON 내보내기를 포함한 편집기 화면입니다. 편집기 shell을 application이 직접 구성해야 한다면 `Studio`를 사용할 수 있습니다.

## 저장소 연결

편집기는 특정 backend에 의존하지 않습니다. `AnimationRepository`를 구현하면 REST API, browser storage, Git 기반 저장소 등 원하는 데이터 계층을 연결할 수 있습니다.

```ts
import type { AnimationRepository } from "@kokoa/clotho-editor";

const repository: AnimationRepository = {
  list: async () => api.list(),
  load: async (id) => api.load(id),
  create: async (id, title) => api.create(id, title),
  save: async (document) => api.save(document),
  delete: async (id) => api.delete(id),
};
```

간단한 demo나 offline 편집기는 `createLocalStorageRepository`를 사용하면 됩니다. 기존 HTTP API를 사용하는 application은 `configureApi({ baseUrl })`로 기본 adapter를 설정할 수도 있습니다.

## Host hooks

상단 제목과 이미지 처리 방식은 실행 환경에서 정할 수 있습니다. `resolveImage`를 지정하지 않으면 이미지를 data URL로 변환해 문서의 `assets`에 저장합니다. 같은 이미지는 하나의 asset을 공유하며, 사용되지 않는 asset은 JSON을 내보낼 때 제거됩니다.

```tsx
<StudioMount
  editorTitle="블로그 애니메이션 편집기"
  repository={repository}
  resolveImage={async (file) => uploadToMediaServer(file)}
/>
```

저장 버튼의 동작 자체를 바꾸려면 repository의 `create`와 `save`를 구현합니다. 예제 목록은 repository의 `list`와 `load`에서 제공하므로 editor package 안에 application별 API 경로를 넣을 필요가 없습니다.

## Plugin host

application 전용 도구는 `plugins`로 추가할 수 있습니다. plugin은 toolbar, 왼쪽 panel, inspector와 command palette에 기능을 붙일 수 있지만, 문서를 읽거나 바꾸려면 host가 권한을 명시적으로 허용해야 합니다. 저장소, selection, undo/redo와 같은 편집기의 기본 기능은 plugin으로 분리하지 않습니다.

```tsx
import { StudioMount, type EditorPluginDefinition } from "@kokoa/clotho-editor";

const reviewPlugin: EditorPluginDefinition = {
  manifest: {
    id: "com.example.review",
    version: "1.0.0",
    capabilities: ["editor"],
    editor: { toolbarItems: ["review"] },
  },
  toolbarItems: {
    review: ({ container, document }) => {
      const button = document.createElement("button");
      button.textContent = "검토 요청";
      container.append(button);
    },
  },
};

<StudioMount
  plugins={[reviewPlugin]}
  resolvePluginPermissions={(manifest) =>
    manifest.id === "com.example.review" ? { ui: true, documentRead: true } : {}
  }
/>;
```

Clotho compiler plugin이 새로운 JSON 입력 형식을 처리해야 한다면 `importDocument`에서 compiler pipeline을 연결합니다. 이 경계 덕분에 Editor는 application의 plugin registry나 backend에 의존하지 않습니다.

```tsx
import { createPluginRegistry, runPluginPipeline } from "@kokoa/clotho/plugins";

const registry = createPluginRegistry(compilerPlugins);

<StudioMount
  importDocument={(input) => {
    const result = runPluginPipeline(input, { registry });
    if (!result.ok) throw result.error;
    return result.document;
  }}
/>;
```

현재 plugin API는 신뢰할 수 있는 application code를 위한 실험적 API입니다. 외부에서 받은 plugin은 별도 Worker나 격리 환경에서 실행한 뒤 JSON 결과만 Editor로 전달해야 합니다.

## 주요 기능

- Clotho v1 JSON 문서 작성과 검증
- 사각형, 원, 선, 화살표, 텍스트, 이미지, Path, 다각형과 그룹 편집
- anchor를 유지하는 선 연결과 다중 선택
- keyframe, effect, chapter와 재생 설정 편집
- light/dark theme와 단계 목록 위치 설정
- 별도 브라우저 창으로 분리할 수 있는 timeline
- 실제 `@kokoa/clotho/dom` player를 사용하는 독립 미리보기
- JSON 가져오기와 내보내기, 참조되지 않는 image asset 정리

도구 단축키는 편집기 안에서 확인할 수 있으며 input, textarea와 contenteditable에 입력하는 동안에는 동작하지 않습니다.

## 독립 실행형 앱

저장소의 `app`은 package 통합 예제이자 Cloudflare Workers Static Assets용 demo입니다.

```bash
bun install
bun run app:dev
bun run build:app
bun run dev:cloudflare
```

Cloudflare Dashboard에서는 Build command를 `bun run build:app`, Deploy command를 `npx wrangler deploy`로 지정합니다. custom domain은 Dashboard에서 별도로 연결합니다.

## 개발

```bash
bun install --frozen-lockfile
bun run typecheck
bun test
bun run build
```

npm release는 GitHub Release와 [publish workflow](./.github/workflows/publish.yml)를 통해 진행합니다. `@kokoa/clotho`의 호환 버전이 먼저 공개되어 있어야 합니다.

## 문서

- [Clotho 저장소](https://github.com/shinkeonkim/clotho)
- [Clotho Editor demo](https://clotho-editor.shinkeonkim.com/)
- [Porting 기록](./docs/PORTING.md)

## 라이선스

MIT
