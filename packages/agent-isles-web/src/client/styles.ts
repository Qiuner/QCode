export const WORLD_STYLES = `
[data-agent-isles-town] > :not([data-shell-overlay]) { visibility: hidden; pointer-events: none; }
.town-shell { position: absolute; inset: 0; pointer-events: auto; color: #203c37; font: 14px/1.5 "Segoe UI", "Microsoft YaHei", sans-serif; }
.town-shell * { box-sizing: border-box; letter-spacing: 0; }
.town-shell > iframe { width: 100%; height: 100%; border: 0; }
.town-work-entry { position: absolute; top: 20px; left: 20px; max-width: calc(100% - 110px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; box-shadow: 0 4px 16px #183a3922; }
[aria-label='居民工作记录'] .town-dialogue-choices { display: grid; grid-template-columns: 1fr; }
[aria-label='居民工作记录'] button { text-align: left; white-space: normal; overflow-wrap: anywhere; }
[aria-label='居民工作记录'] small { display: block; }
.town-guide-tools { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.town-shell a { color: #235950; }
.town-shell button { font: inherit; cursor: pointer; min-height: 36px; border: 1px solid #a8c0b7; border-radius: 6px; padding: 7px 12px; color: #203c37; background: #f4f8f3; }
.town-shell button:hover { background: #e1eee5; }
.town-shell button:disabled { opacity: .55; cursor: not-allowed; }
.town-regions { position: absolute; left: 20px; bottom: 104px; width: min(320px, calc(100% - 40px)); padding: 12px 14px; border-left: 3px solid #b78325; border-radius: 4px; background: #f5faf4f5; box-shadow: 0 3px 14px #17392c20; }
.town-regions p { margin: 4px 0 8px; overflow-wrap: anywhere; }
.town-regions progress { position: static; display: block; width: 100%; height: 4px; accent-color: #267b69; }
.town-regions[data-stage='failed'] { border-color: #b5463c; }
.town-regions [role='alert'] { color: #9d342c; }
.town-panel { position: absolute; right: 20px; top: 84px; bottom: 110px; width: min(410px, calc(100% - 40px)); overflow: auto; padding: 18px; border: 1px solid #aac3b5; border-radius: 8px; background: #f7faf5f7; box-shadow: 0 8px 30px #17392c30; }
.town-panel > header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.town-panel h2 { font-size: 18px; margin: 0; }
.town-panel h3 { font-size: 15px; margin: 18px 0 8px; }
.town-panel > header button { width: 36px; height: 36px; padding: 0; font-size: 24px; flex: none; }
.town-panel form { display: grid; gap: 8px; margin: 16px 0; }
.town-panel input, .town-panel textarea, .town-panel select { display: block; width: 100%; font: inherit; padding: 9px; color: #203c37; background: #fff; border: 1px solid #aac3b5; border-radius: 5px; }
.town-panel textarea { resize: vertical; min-height: 90px; }
.town-panel form > button { justify-self: end; background: #226858; color: white; }
.town-panel p, .town-path { overflow-wrap: anywhere; }
.town-panel [role='alert'] { color: #a53d36; }
.town-introductions { display: grid; gap: 8px; margin-top: 18px; }
.town-results { border-top: 1px solid #c4d5cc; margin-top: 16px; }
.town-results article, .town-results pre { white-space: pre-wrap; overflow-wrap: anywhere; padding: 12px 0; border-bottom: 1px solid #d8e2dc; }
.town-results pre { font-size: 12px; }
.town-approval { padding: 12px 0; border-block: 1px solid #d1aa5f; }
.town-shell :is(button,a,input,textarea,select):focus-visible { outline: 2px solid #1b8171; outline-offset: 3px; }
.town-conversation { top: auto; bottom: 28px; left: 50%; right: auto; transform: translateX(-50%); width: min(720px, calc(100% - 40px)); max-height: min(480px, 54svh); padding: 0; display: flex; flex-direction: column; overflow: hidden; background: #fcfdf8; border: 1px solid #bed0bf; box-shadow: 0 10px 36px #183a3933; }
.town-conversation:focus { outline: none; }
.town-conversation > header { flex: none; padding: 12px 20px 0; justify-content: flex-start; }
.town-portrait { width: 64px; height: 64px; object-fit: contain; flex: none; background: #e6eee0; border-radius: 50%; }
.town-conversation > header > div { flex: 1; min-width: 0; }
.town-conversation > header small { color: #667867; font-size: 12px; }
.town-conversation > header h2 { font-size: 19px; color: #254236; }
.town-conversation > header button { border: 0; background: transparent; align-self: flex-start; }
.town-conversation-body { overflow-y: auto; min-height: 0; padding: 0 24px 18px; overscroll-behavior: contain; }
.town-dialogue-line { font-size: 17px; line-height: 1.7; margin: 12px 0 18px; }
.town-dialogue-choices { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.town-dialogue-choices button { min-height: 42px; padding: 8px 16px; background: #fff; }
.town-dialogue-choices .town-primary { color: #fff; border-color: #326b50; background: #326b50; }
.town-dialogue-choices .town-primary:hover { background: #24543e; }
.town-dialogue-choices small { display: block; color: #677766; font-size: 11px; }
.town-dialogue-footer { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 4px 18px; }
.town-shell .town-text-action { border: 0; background: transparent; padding: 4px 0; min-height: 32px; font-size: 12px; color: #667867; }
.town-shell .town-text-action:hover { color: #254236; text-decoration: underline; }
.town-project-select { display: grid; gap: 5px; margin-top: 14px; }
.town-shell[data-conversation] .town-regions { bottom: auto; top: 20px; }
.town-conversation button:active:not(:disabled) { transform: translateY(1px); }
@media (max-width: 800px) {
  .town-panel { right: 12px; width: calc(100% - 24px); top: 92px; bottom: 164px; padding: 14px; }
  .town-regions { left: 12px; bottom: 156px; width: calc(100% - 24px); padding: 10px 12px; }
  .town-shell[data-regions-pending] .town-panel { bottom: 300px; }
  .town-shell .town-conversation, .town-shell[data-regions-pending] .town-conversation { top: auto; bottom: 16px; left: 12px; right: 12px; transform: none; width: auto; max-height: 56svh; padding: 0; }
  .town-conversation > header { padding: 10px 14px 0; }
  .town-conversation-body { padding: 0 16px 14px; }
  .town-portrait { width: 48px; height: 48px; }
  .town-dialogue-line { font-size: 15px; margin: 10px 0 14px; }
  .town-shell[data-conversation] .town-regions { top: 12px; bottom: auto; width: min(300px, calc(100% - 80px)); }
}
[data-agent-isles-shell] {
  --agent-isles-panel-width: clamp(420px, 34vw, 520px);
  grid-template-columns: minmax(0, 1fr) var(--agent-isles-panel-width) 0 !important;
  transition: none !important;
}
[data-agent-isles-shell][data-agent-isles-chat='closed'] { --agent-isles-panel-width: 0px; }
[data-agent-isles-shell][data-agent-isles-chat='closed'] > :not([data-shell-overlay]) { visibility: hidden; }
.agent-isles-overlay[data-chat-open='false'] { border-right: 0; }
.agent-isles-overlay[data-chat-open='false'] .agent-isles-topbar { right: 150px; }
.agent-isles-chat-toggle, .agent-isles-residents-open, .agent-isles-residents-close { border: 1px solid #739487; border-radius: 6px; color: #f7f0dc; background: #173b35ed; cursor: pointer; pointer-events: auto; font: inherit; }
.agent-isles-chat-toggle { position: fixed; top: 16px; right: 18px; z-index: 3; min-height: 40px; padding: 0 12px; font-size: 13px; }
.agent-isles-residents-open { position: absolute; top: 76px; right: 18px; min-height: 40px; padding: 0 12px; font-size: 13px; }
.agent-isles-residents-close { flex: none; width: 30px; height: 30px; font-size: 20px; }
.agent-isles-chat-toggle:hover, .agent-isles-residents-open:hover, .agent-isles-residents-close:hover { background: #315f50; }
.agent-isles-chat-toggle:focus-visible, .agent-isles-residents-open:focus-visible, .agent-isles-residents-close:focus-visible { outline: 2px solid #e6cc8c; outline-offset: 2px; }
.agent-isles-overlay { position: absolute; inset: 0 var(--agent-isles-panel-width) 0 0; pointer-events: none !important; border-right: 1px solid var(--dsw-alias-border-l3); background: #152e29; }
.agent-isles-world { position: absolute; inset: 0; overflow: hidden; pointer-events: auto; background: #173b35; }
.agent-isles-iframe { display: block; width: 100%; height: 100%; border: 0; background: #173b35; }
.agent-isles-topbar { position: absolute; top: 16px; left: 18px; right: 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; pointer-events: none; }
.agent-isles-topbar > div { min-width: 0; color: #f7f0dc; text-shadow: 0 1px 12px #0b211d; }
.agent-isles-topbar strong, .agent-isles-topbar span { display: block; letter-spacing: 0; }
.agent-isles-topbar strong { font-size: 18px; line-height: 24px; }
.agent-isles-topbar div > span { max-width: min(54vw, 520px); overflow: hidden; color: #c8dacd; font-size: 12px; line-height: 18px; text-overflow: ellipsis; white-space: nowrap; }
.agent-isles-topbar button, .agent-isles-return-button { display: inline-flex; align-items: center; justify-content: center; border: 1px solid #739487; color: #f7f0dc; background: #173b35e8; cursor: pointer; pointer-events: auto; }
.agent-isles-topbar button { flex: none; width: 40px; height: 40px; border-radius: 6px; font-size: 20px; }
.agent-isles-topbar button:hover, .agent-isles-return-button:hover { background: #26574a; }
.agent-isles-topbar button:focus-visible, .agent-isles-return-button:focus-visible { outline: 3px solid #e6cc8c; outline-offset: 3px; }
.agent-isles-connection { position: absolute; left: 18px; bottom: 16px; display: flex; align-items: center; gap: 8px; padding: 7px 10px; border: 1px solid #58796d; border-radius: 6px; color: #d9e5da; background: #173b35e8; font-size: 12px; line-height: 16px; pointer-events: none; }
.agent-isles-connection > span { width: 7px; height: 7px; border-radius: 50%; background: #d6a24f; }
.agent-isles-connection[data-ready] > span { background: #7ac99a; }
.agent-isles-return-button { position: absolute; top: 16px; right: 20px; z-index: 1; gap: 8px; min-height: 38px; padding: 0 13px; border-radius: 6px; font: inherit; }
.agent-isles-residents { position: absolute; top: 76px; right: 18px; z-index: 2; width: min(270px, calc(100% - 36px)); padding: 10px; border: 1px solid #58796d; border-radius: 8px; color: #f7f0dc; background: #173b35e8; box-shadow: 0 10px 28px #071b17aa; }
.agent-isles-residents-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 3px 4px 8px; }
.agent-isles-residents-heading strong { font-size: 13px; }
.agent-isles-residents-heading span { min-width: 0; overflow: hidden; color: #b9d0c2; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.agent-isles-resident { display: flex; align-items: center; width: 100%; min-height: 43px; gap: 9px; padding: 7px 8px; border: 0; border-top: 1px solid #42665a; color: inherit; background: transparent; cursor: pointer; text-align: left; }
.agent-isles-resident:first-of-type { border-top: 0; }
.agent-isles-resident:hover:not(:disabled) { background: #26574a; }
.agent-isles-resident[data-active] { background: #315f50; box-shadow: inset 3px 0 #e6cc8c; }
.agent-isles-resident[data-needs-workspace] { color: #d8e4dc; }
.agent-isles-resident:disabled { cursor: not-allowed; opacity: .55; }
.agent-isles-resident:focus-visible { outline: 2px solid #e6cc8c; outline-offset: -2px; }
.agent-isles-resident-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: #9fb8aa; }
.agent-isles-resident-dot[data-status='working'], .agent-isles-resident-dot[data-status='thinking'] { background: #e1b75c; }
.agent-isles-resident-dot[data-status='approval'] { background: #e98d6e; }
.agent-isles-resident-dot[data-status='completed'] { background: #7ac99a; }
.agent-isles-resident-dot[data-status='failed'] { background: #e16d6d; }
.agent-isles-resident-copy { display: grid; min-width: 0; flex: 1; gap: 2px; }
.agent-isles-resident-copy strong { overflow: hidden; font-size: 12px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.agent-isles-resident-copy small { color: #b9d0c2; font-size: 11px; }
.agent-isles-hero-mark { border-radius: 5px; }
span:has(.agent-isles-hero-mark) + span { font-size: 0; }
span:has(.agent-isles-hero-mark) + span::after { content: '和 AI 一起学会创造'; font-size: 26px; }
span:has(.agent-isles-hero-mark) + span + span { font-size: 0; }
span:has(.agent-isles-hero-mark) + span + span::after { content: 'AI 教育'; font-size: 12px; }
.agent-isles-prompt { display: grid; gap: 7px; margin: 10px 4px 2px; padding-top: 10px; border-top: 1px solid #42665a; }
.agent-isles-prompt label { color: #c8dacd; font-size: 11px; }
.agent-isles-prompt textarea { resize: vertical; min-height: 58px; padding: 8px; border: 1px solid #58796d; border-radius: 5px; color: #f7f0dc; background: #102a25cc; font: inherit; font-size: 12px; line-height: 17px; }
.agent-isles-prompt textarea:focus-visible { outline: 2px solid #e6cc8c; outline-offset: 1px; }
.agent-isles-prompt button { justify-self: end; min-height: 30px; padding: 0 12px; border: 1px solid #8ab39e; border-radius: 5px; color: #173b35; background: #d8c27f; cursor: pointer; font: inherit; font-size: 12px; font-weight: 600; }
.agent-isles-prompt button:disabled { cursor: not-allowed; opacity: .5; }
@media (max-width: 800px) {
  [data-agent-isles-shell] { --agent-isles-panel-width: min(420px, 100vw); }
  .agent-isles-topbar div > span { max-width: 65vw; }
  .agent-isles-residents { top: auto; right: 12px; bottom: 62px; width: min(280px, calc(100% - 24px)); }
}
`
