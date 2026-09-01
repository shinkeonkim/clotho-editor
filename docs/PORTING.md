# Studio → clotho-editor 이식 계획

기존 Studio(비주얼 에디터)를 clotho 기반 독립 패키지로 옮기는 계획. clotho 저장소의 [`TASKS.md`](../../clotho/TASKS.md) Phase 8에 대응한다.

---

## 1. 조사 결과 (8.1)

Studio는 두 저장소에 거의 동일한 코드로 존재한다.

| 위치                                               |   LOC | 비고                  |
| -------------------------------------------------- | ----: | --------------------- |
| `shinkeonkim.github.io/src/dev-only/studio/`       | 8,980 | 테스트 2개 포함       |
| `oh-my-blog/packages/animation-studio/src/legacy/` | 8,751 | 위를 패키지로 감싼 것 |

**clotho 코어에 대한 의존 경계가 좁다.** 엔진에서 가져오는 심볼을 전수 조사한 결과:

| 심볼                                                                             | 사용 파일 수 | clotho 대응               |
| -------------------------------------------------------------------------------- | -----------: | ------------------------- |
| `AnimationElement` 및 요소별 타입                                                |           12 | 동일                      |
| `AnimationDef`                                                                   |           11 | `AnimationDocument`       |
| `animationDefSchema`                                                             |            4 | `animationDocumentSchema` |
| `SnapshotMap`                                                                    |            4 | 동일                      |
| `Anchor`                                                                         |            4 | 동일                      |
| `Appearance` / `PropertyTrack` / `TrackKeyframe` / `Chapter` / `AnimationEffect` |       각 1~3 | 동일                      |
| `EntryMode` / `ExitMode`                                                         |         각 1 | 동일                      |
| `computeSnapshot` / `activeAppearance`                                           |         각 1 | 동일                      |
| `ID_RE`                                                                          |            2 | 동일                      |
| `ANIM_DIR` (loader)                                                              |            2 | 호스트가 정한다           |

즉 **스키마와 런타임뿐이며 렌더러는 쓰지 않는다.** Studio는 자체 캔버스 미리보기를 갖고 있다(`canvas-preview.ts`). 이식은 import 경로 변경이 대부분이다.

### 규모가 큰 모듈

| 파일              |    LOC | 성격                                         |
| ----------------- | -----: | -------------------------------------------- |
| `icon-data.ts`    |  2,016 | 아이콘 SVG 데이터. 호스트 자산으로 분리 후보 |
| `canvas.ts`       |  1,207 | 캔버스 상호작용(드래그·리사이즈·선택)        |
| `properties.ts`   |    623 | 속성 패널                                    |
| `timeline.ts`     |    394 | 타임라인                                     |
| `canvas-utils.ts` |    318 | 좌표 변환                                    |
| `state/*`         | 약 900 | 상태·히스토리·요소·타임라인                  |

---

## 2. clotho가 이미 대체하는 것

이식하지 말고 clotho를 쓸 것:

| Studio가 갖고 있던 것                    | clotho                                        |
| ---------------------------------------- | --------------------------------------------- |
| 자체 스냅샷 계산                         | `computeSnapshot`                             |
| 자체 캔버스 미리보기 렌더                | `buildScene` + `clotho/dom` `patchScene`      |
| 자체 타임라인 스크럽 시각 계산           | `createPlayer` — `seek()`가 그대로 스크럽이다 |
| 자체 앵커 좌표 계산 (`anchor-system.ts`) | `anchorPoint` / `resolveEndpoints`            |
| 자체 좌표 변환 일부 (`canvas-utils.ts`)  | `geometry/matrix`                             |
| 저장 전 검증                             | `validateDocument` — 미지의 속성까지 잡는다   |

`canvas-preview.ts`를 `patchScene`으로 바꾸면 **에디터 미리보기와 배포된 애니메이션이 같은 렌더 경로를 쓴다.** 지금은 두 구현이 갈라져 있어 에디터에서 맞게 보이는 것이 사이트에서 다르게 보일 수 있다.

---

## 3. v1 때문에 반드시 바뀌는 것

| 영역                       | 변경                                    | 영향                                                                                      |
| -------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------- |
| `studio-groups.ts` (187줄) | `childIds` → `parentId`                 | 그룹 편집 UI 재작성. **legacy 그룹은 렌더된 적이 없으므로 여기서 처음으로 실제 동작한다** |
| 이미지 요소                | `src` → `assetId` + `assets` 레지스트리 | 이미지 첨부 UI 신설 (`encodeImageAsset`)                                                  |
| `studio-image-upload.ts`   | 업로드 엔드포인트 전제                  | `inline`(base64) / `external` / `ref` 3택                                                 |
| `state/types.ts`           | `AnimationDef`                          | `AnimationDocument`                                                                       |
| 트랙 편집                  | —                                       | `interpolate` 모드 선택 UI 추가 가능                                                      |
| 검증 표시                  | 없음                                    | `validateDocument` 결과를 패널에 표시                                                     |

---

## 4. 이식 결과 (8.3~8.6, 완료)

`oh-my-blog/packages/animation-studio`의 **v1 마이그레이션이 끝난 상태**를 원본으로 가져왔다. 재작성이 아니라 이식이고, v1 전환 작업(그룹 `parentId`, 이미지 `assetId`, 미리보기 교체)이 이미 반영돼 있었기 때문이다.

| 항목      | 결과                                        |
| --------- | ------------------------------------------- |
| 이식 규모 | 약 8,900 LOC (26 파일 + Studio/StudioMount) |
| typecheck | 0 errors                                    |
| build     | ESM + `.d.ts` + `styles.css`                |
| 테스트    | 17 pass (그룹 9 · 에셋 7 · API 1)           |

### 이식하며 바꾼 것

- **미리보기가 clotho를 쓴다.** `canvas-preview.ts`가 `clotho/dom`의 `mountStage`를 호출한다. 에디터와 배포본이 같은 `buildScene` + `patchScene`을 지나므로 두 렌더가 갈라질 수 없다.
- **완성형 미리보기도 clotho를 쓴다.** `player-popout.ts`는 `clotho/dom`의 `mountPlayer`를 별도 창에 직접 마운트한다. 제목, 조작 버튼, caption과 chapter 목록을 포함해 실제 사용처의 컴포넌트 구조를 확인하는 경로다.
- **`Studio.tsx`가 `AnimationStage` + `usePlayer`로 바뀌었다.** 에디터가 타임라인의 주인이고 플레이어는 미리보기 중일 때만 시계를 공급한다.
- **호스트 의존을 설정으로 뺐다** (8.6). `configureApi({ baseUrl })`와 `configureHost({ placeholderImageUrl })`. 기본값은 원래 값이라 기존 호스트는 아무것도 바꿀 필요가 없다.
- **그룹(8.4)·이미지(8.5)에 회귀 테스트를 붙였다.** 둘 다 legacy에 없던 동작이라 테스트가 없으면 동작 여부를 확인할 방법이 없다.

### 남은 정리

- `canvas.ts`는 선택 영역, resize handle, anchor와 drag hit area를 그리기 위한 authoring surface다. 문서 검증, snapshot 계산, 재생 clock과 실제 출력은 Clotho가 담당한다. 장기적으로 Clotho scene node가 편집용 element ID를 노출하면 authoring surface도 `patchScene` 위의 overlay만 남길 수 있다.

- `noUncheckedIndexedAccess`가 꺼져 있다. 켜면 84개 에러가 나오는데 전부 테스트 없이 도착한 코드의 미검사 인덱스 접근이다. 눈감고 고치면 버그를 찾는 게 아니라 동작을 바꾸게 되므로, `legacy/`를 모듈 단위로 다시 쓸 때 함께 켠다. clotho 본체는 켜져 있다.
- `legacy/` 라는 디렉터리 이름 자체가 정리 대상이다. clotho가 대체한 것 (`anchor-system`의 앵커 계산, `canvas-utils`의 좌표 변환 일부)을 걷어내면서 모듈을 제 위치로 옮긴다.
- `icon-data.ts` 2,016줄은 아이콘 SVG 데이터다. 호스트 자산으로 분리 후보.

## 5. 원래 계획했던 순서 (참고)

1. **상태 계층** (`state/*`) — v1 타입으로. 여기가 나머지 전부의 기반이다.
2. **히스토리** (`studio-history.ts`) — 순수하므로 그대로.
3. **캔버스 미리보기** → `buildScene` + `patchScene`으로 교체.
4. **캔버스 상호작용** (`canvas.ts`, `canvas-handles.ts`) — 좌표 변환은 `geometry/matrix`로.
5. **타임라인** → `createPlayer.seek()` 기반.
6. **속성 패널** — v1 필드에 맞춰. `parentId`, `assetId`, `interpolate` 추가.
7. **그룹 편집 UI** (8.4) — `parentId` 모델. 신규.
8. **이미지 첨부 UI** (8.5) — `encodeImageAsset` + `AssetResolver`.
9. **호스트 의존 기능 어댑터화** (8.6) — 아이콘 라이브러리, 저장/불러오기 API, 이미지 업로드. 전부 주입 인터페이스로.

---

## 6. 전제 조건

`@kokoa/clotho`가 설치 가능해야 한다. 배포 전에는 `package.json`의 의존이 `"file:../clotho"`이며, 이 상태로 typecheck·build·테스트가 전부 통과한다. 배포 후 버전 지정으로 바꾼다.
