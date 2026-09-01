"use client";

import { useEffect, useState } from "react";
import type { AnimationDocument } from "@kokoa/clotho";
import { AnimationStage, usePlayer } from "@kokoa/clotho/react";
import { downloadAnimationJson } from "./export-json";

type EditableElement = Record<string, unknown> & { id: string; type: string };
type ElementList = AnimationDocument["elements"];

export interface StudioProps {
  initial: AnimationDocument;
  onSave: (def: AnimationDocument) => void | Promise<void>;
}

function elementsOf(def: AnimationDocument): EditableElement[] {
  return def.elements as unknown as EditableElement[];
}

export function Studio({ initial, onSave }: StudioProps): React.JSX.Element {
  const [def, setDef] = useState<AnimationDocument>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(
    elementsOf(initial)[0]?.id ?? null,
  );
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // The clock for preview playback. It lives outside React (core/player), so the
  // editor subscribes rather than owning a rAF loop of its own.
  const { player, state: playerState } = usePlayer(def, { autoplay: false });

  useEffect(() => {
    if (playing) player.play();
    else {
      player.pause();
      player.seek(time);
    }
  }, [playing, player, time]);

  const elements = elementsOf(def);
  const selected = elements.find((e) => e.id === selectedId) ?? null;
  const scalarProps = selected
    ? Object.entries(selected).filter(
        ([key, value]) =>
          (typeof value === "string" || typeof value === "number") &&
          key !== "id" &&
          key !== "type",
      )
    : [];

  function setElements(next: EditableElement[]): void {
    setDef((current) => ({
      ...current,
      elements: next as unknown as ElementList,
    }));
    setSaved(false);
  }

  function updateElement(
    id: string,
    key: string,
    raw: string,
    numeric: boolean,
  ): void {
    setElements(
      elements.map((e) =>
        e.id === id ? { ...e, [key]: numeric ? Number(raw) : raw } : e,
      ),
    );
  }

  function addElement(): void {
    const id = `el-${Date.now().toString(36)}`;
    const el: EditableElement = {
      type: "text",
      id,
      x: 100,
      y: 100,
      rotation: 0,
      content: "New",
      translations: {},
      fontSize: 24,
      color: "#4f46e5",
      textAnchor: "start",
      appearances: [{ start: 0, end: def.duration }],
      tracks: [],
    };
    setElements([...elements, el]);
    setSelectedId(id);
  }

  function deleteElement(id: string): void {
    setElements(elements.filter((e) => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    try {
      await onSave(def);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="studio">
      <aside className="studio-panel studio-left">
        <div className="studio-panel-head">
          <span>요소 ({elements.length})</span>
          <button type="button" className="studio-btn" onClick={addElement}>
            + 추가
          </button>
        </div>
        <ul className="studio-el-list">
          {elements.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className={
                  e.id === selectedId ? "studio-el active" : "studio-el"
                }
                onClick={() => setSelectedId(e.id)}
              >
                <span className="studio-el-type">{e.type}</span>
                <span className="studio-el-id">{e.id}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="studio-preview">
        <div className="studio-preview-bar">
          <button
            type="button"
            className="studio-btn"
            onClick={() => downloadAnimationJson(def)}
          >
            JSON 내보내기
          </button>
          <button
            type="button"
            className="studio-btn"
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? "⏸ 정지" : "▶ 재생"}
          </button>
          <input
            type="range"
            min={0}
            max={def.duration}
            step={50}
            value={time}
            disabled={playing}
            onChange={(e) => {
              setTime(Number(e.target.value));
              setPlaying(false);
            }}
          />
          <span className="studio-time">
            {time} / {def.duration}ms
          </span>
          <button
            type="button"
            className="studio-btn studio-save"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? "저장 중…" : saved ? "✓ 저장됨" : "저장"}
          </button>
        </div>
        <div className="studio-canvas">
          {/* One frame at a time: the editor's scrubber is the source of truth, and the
              player only supplies the clock while previewing. Same buildScene path as
              the published animation, so preview and production cannot diverge. */}
          <AnimationStage doc={def} time={playing ? playerState.time : time} />
        </div>
      </div>

      <aside className="studio-panel studio-right">
        <div className="studio-panel-head">메타</div>
        <label className="studio-field">
          <span>제목</span>
          <input
            value={def.title}
            onChange={(e) => {
              setDef((d) => ({ ...d, title: e.target.value }));
              setSaved(false);
            }}
          />
        </label>
        <label className="studio-field">
          <span>duration (ms)</span>
          <input
            type="number"
            value={def.duration}
            onChange={(e) => {
              setDef((d) => ({ ...d, duration: Number(e.target.value) }));
              setSaved(false);
            }}
          />
        </label>
        <div className="studio-panel-head">
          속성 {selected ? `(${selected.type})` : ""}
        </div>
        {selected ? (
          <>
            {scalarProps.map(([key, value]) => (
              <label key={key} className="studio-field">
                <span>{key}</span>
                <input
                  value={String(value)}
                  onChange={(e) =>
                    updateElement(
                      selected.id,
                      key,
                      e.target.value,
                      typeof value === "number",
                    )
                  }
                />
              </label>
            ))}
            <button
              type="button"
              className="studio-btn studio-del"
              onClick={() => deleteElement(selected.id)}
            >
              요소 삭제
            </button>
          </>
        ) : (
          <p className="studio-empty">요소를 선택하세요.</p>
        )}
      </aside>
    </div>
  );
}
