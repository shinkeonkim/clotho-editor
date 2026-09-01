import type { StudioUi } from "./studio-ui";
import { getCurrentTime, getDef, setCurrentTime, subscribe } from "./state";

export function setupTimelinePopout(
  ui: StudioUi,
  togglePlayback: () => void,
): void {
  let popup: Window | null = null;
  let channel: BroadcastChannel | null = null;
  let unsubscribe: (() => void) | null = null;
  let closeTimer: number | null = null;

  const cleanup = (): void => {
    unsubscribe?.();
    unsubscribe = null;
    channel?.close();
    channel = null;
    if (closeTimer !== null) window.clearInterval(closeTimer);
    closeTimer = null;
    popup = null;
    ui.app.classList.remove("is-timeline-detached");
    ui.detachTimelineBtn.setAttribute("aria-pressed", "false");
    ui.detachTimelineBtn.textContent = "▣ 타임라인 분리";
  };

  ui.detachTimelineBtn.addEventListener("click", () => {
    if (popup && !popup.closed) {
      popup.focus();
      return;
    }
    const channelName = `clotho-timeline-${crypto.randomUUID()}`;
    popup = window.open("", "_blank", "popup=yes,width=1200,height=620");
    if (!popup) {
      ui.status.textContent = "브라우저에서 popup을 허용해주세요.";
      return;
    }
    popup.document.write(timelineDocument(channelName));
    popup.document.close();
    channel = new BroadcastChannel(channelName);
    const publish = (): void => {
      channel?.postMessage({
        type: "state",
        def: getDef(),
        time: getCurrentTime(),
      });
    };
    channel.addEventListener("message", (event: MessageEvent) => {
      const message = event.data as { type?: string; time?: number };
      if (message.type === "ready") publish();
      if (message.type === "seek" && typeof message.time === "number")
        setCurrentTime(message.time);
      if (message.type === "toggle-play") togglePlayback();
      if (message.type === "merge") {
        popup?.close();
        cleanup();
      }
    });
    unsubscribe = subscribe(publish);
    publish();
    closeTimer = window.setInterval(() => {
      if (popup?.closed) cleanup();
    }, 500);
    ui.detachTimelineBtn.setAttribute("aria-pressed", "true");
    ui.detachTimelineBtn.textContent = "▣ 분리된 타임라인 열기";
    ui.app.classList.add("is-timeline-detached");
  });
}

function timelineDocument(channelName: string): string {
  const channelLiteral = JSON.stringify(channelName).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Clotho Timeline</title><style>
  :root{color-scheme:dark;font-family:ui-sans-serif,system-ui;background:#0f172a;color:#e2e8f0}body{margin:0;padding:20px}.bar{display:flex;gap:12px;align-items:center;position:sticky;top:0;background:#0f172a;padding-bottom:16px}.bar button{padding:8px 14px}.bar input{flex:1}.meta{color:#94a3b8}.track{position:relative;height:42px;border:1px solid #475569;border-radius:6px;margin:8px 0;background:#1e293b;overflow:hidden}.label{position:absolute;left:10px;top:11px;z-index:2}.appearance{position:absolute;top:5px;height:30px;background:#4f46e580;border-radius:4px}.playhead{position:fixed;top:0;bottom:0;width:2px;background:#ef4444;pointer-events:none;z-index:5}h1{font-size:18px}
  </style></head><body><div class="bar"><button id="merge">↙ 편집기에 다시 합치기</button><button id="play">재생 / 정지</button><input id="seek" type="range" min="0" value="0"><span id="time">0 ms</span></div><h1 id="title">Clotho Timeline</h1><div id="meta" class="meta"></div><main id="tracks"></main><div id="playhead" class="playhead"></div><script>
  const channel=new BroadcastChannel(${channelLiteral});const seek=document.getElementById('seek');const tracks=document.getElementById('tracks');document.getElementById('merge').onclick=()=>channel.postMessage({type:'merge'});document.getElementById('play').onclick=()=>channel.postMessage({type:'toggle-play'});seek.oninput=()=>channel.postMessage({type:'seek',time:Number(seek.value)});channel.onmessage=({data})=>{if(data.type!=='state'||!data.def)return;const d=data.def,t=data.time||0;document.getElementById('title').textContent=d.title||d.id;document.getElementById('meta').textContent=d.duration+' ms · '+d.elements.length+'개 요소';seek.max=d.duration;seek.value=t;document.getElementById('time').textContent=Math.round(t)+' ms';tracks.innerHTML=d.elements.map(e=>'<div class="track"><span class="label">'+escapeHtml(e.id)+' · '+escapeHtml(e.type)+'</span>'+e.appearances.map(a=>'<i class="appearance" style="left:'+a.start/d.duration*100+'%;width:'+(a.end-a.start)/d.duration*100+'%"></i>').join('')+'</div>').join('');document.getElementById('playhead').style.left=(t/d.duration*100)+'%'};function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}channel.postMessage({type:'ready'});addEventListener('beforeunload',()=>channel.close());
  <\/script></body></html>`;
}
