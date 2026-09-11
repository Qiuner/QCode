export const WORLD_STYLES = `
[data-agentville-town] > :not([data-shell-overlay]) { visibility: hidden; pointer-events: none; }
.town-shell { position: absolute; inset: 0; pointer-events: auto; color: #203c37; font: 14px/1.5 "Segoe UI", "Microsoft YaHei", sans-serif; }
.town-shell * { box-sizing: border-box; letter-spacing: 0; }
.town-shell > iframe { width: 100%; height: 100%; border: 0; }
.town-top { position: absolute; top: 18px; left: 22px; right: 22px; display: flex; justify-content: space-between; align-items: center; gap: 12px; pointer-events: none; }
.town-top > div { padding: 8px 12px; background: #f5faf4eb; border-radius: 6px; max-width: 60%; }
.town-top strong { font-size: 18px; }
.town-top span { display: block; overflow-wrap: anywhere; }
.town-top a { pointer-events: auto; background: #f5faf4; padding: 8px 12px; border-radius: 6px; }
.town-actions { display: flex; align-items: flex-start; gap: 8px; pointer-events: auto; }
.town-shell .town-help-button { display: grid; place-items: center; width: 38px; min-height: 38px; padding: 0; font-size: 18px; font-weight: 700; }
.town-shell a { color: #235950; }
.town-roster { position: absolute; left: 20px; bottom: 24px; display: flex; gap: 6px; max-width: calc(100% - 40px); flex-wrap: wrap; }
.town-shell button { font: inherit; cursor: pointer; min-height: 36px; border: 1px solid #a8c0b7; border-radius: 6px; padding: 7px 12px; color: #203c37; background: #f4f8f3; }
.town-shell button:hover { background: #e1eee5; }
.town-shell button:disabled { opacity: .55; cursor: not-allowed; }
.town-roster button { display: grid; text-align: left; min-width: 120px; background: #f5faf4f5; }
.town-roster button[aria-pressed='true'] { border-color: #267b69; background: #d4e9df; }
.town-roster small { color: #5f726a; }
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
@media (max-width: 800px) {
  .town-top { left: 12px; right: 12px; top: 10px; }
  .town-panel { right: 12px; width: calc(100% - 24px); top: 92px; bottom: 164px; padding: 14px; }
  .town-roster { left: 12px; right: 12px; bottom: 12px; max-width: none; display: grid; grid-template-columns: 1fr 1fr; }
  .town-roster button { min-width: 0; }
}
[data-agentville-shell] {
  --agentville-panel-width: clamp(420px, 34vw, 520px);
  grid-template-columns: minmax(0, 1fr) var(--agentville-panel-width) 0 !important;
  transition: none !important;
}
[data-agentville-shell][data-agentville-chat='closed'] { --agentville-panel-width: 0px; }
[data-agentville-shell][data-agentville-chat='closed'] > :not([data-shell-overlay]) { visibility: hidden; }
.agentville-overlay[data-chat-open='false'] { border-right: 0; }
.agentville-overlay[data-chat-open='false'] .agentville-topbar { right: 150px; }
.agentville-chat-toggle, .agentville-residents-open, .agentville-residents-close { border: 1px solid #739487; border-radius: 6px; color: #f7f0dc; background: #173b35ed; cursor: pointer; pointer-events: auto; font: inherit; }
.agentville-chat-toggle { position: fixed; top: 16px; right: 18px; z-index: 3; min-height: 40px; padding: 0 12px; font-size: 13px; }
.agentville-residents-open { position: absolute; top: 76px; right: 18px; min-height: 40px; padding: 0 12px; font-size: 13px; }
.agentville-residents-close { flex: none; width: 30px; height: 30px; font-size: 20px; }
.agentville-chat-toggle:hover, .agentville-residents-open:hover, .agentville-residents-close:hover { background: #315f50; }
.agentville-chat-toggle:focus-visible, .agentville-residents-open:focus-visible, .agentville-residents-close:focus-visible { outline: 2px solid #e6cc8c; outline-offset: 2px; }
.agentville-overlay { position: absolute; inset: 0 var(--agentville-panel-width) 0 0; pointer-events: none !important; border-right: 1px solid var(--dsw-alias-border-l3); background: #152e29; }
.agentville-world { position: absolute; inset: 0; overflow: hidden; pointer-events: auto; background: #173b35; }
.agentville-iframe { display: block; width: 100%; height: 100%; border: 0; background: #173b35; }
.agentville-topbar { position: absolute; top: 16px; left: 18px; right: 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; pointer-events: none; }
.agentville-topbar > div { min-width: 0; color: #f7f0dc; text-shadow: 0 1px 12px #0b211d; }
.agentville-topbar strong, .agentville-topbar span { display: block; letter-spacing: 0; }
.agentville-topbar strong { font-size: 18px; line-height: 24px; }
.agentville-topbar div > span { max-width: min(54vw, 520px); overflow: hidden; color: #c8dacd; font-size: 12px; line-height: 18px; text-overflow: ellipsis; white-space: nowrap; }
.agentville-topbar button, .agentville-return-button { display: inline-flex; align-items: center; justify-content: center; border: 1px solid #739487; color: #f7f0dc; background: #173b35e8; cursor: pointer; pointer-events: auto; }
.agentville-topbar button { flex: none; width: 40px; height: 40px; border-radius: 6px; font-size: 20px; }
.agentville-topbar button:hover, .agentville-return-button:hover { background: #26574a; }
.agentville-topbar button:focus-visible, .agentville-return-button:focus-visible { outline: 3px solid #e6cc8c; outline-offset: 3px; }
.agentville-connection { position: absolute; left: 18px; bottom: 16px; display: flex; align-items: center; gap: 8px; padding: 7px 10px; border: 1px solid #58796d; border-radius: 6px; color: #d9e5da; background: #173b35e8; font-size: 12px; line-height: 16px; pointer-events: none; }
.agentville-connection > span { width: 7px; height: 7px; border-radius: 50%; background: #d6a24f; }
.agentville-connection[data-ready] > span { background: #7ac99a; }
.agentville-return-button { position: absolute; top: 16px; right: 20px; z-index: 1; gap: 8px; min-height: 38px; padding: 0 13px; border-radius: 6px; font: inherit; }
.agentville-residents { position: absolute; top: 76px; right: 18px; z-index: 2; width: min(270px, calc(100% - 36px)); padding: 10px; border: 1px solid #58796d; border-radius: 8px; color: #f7f0dc; background: #173b35e8; box-shadow: 0 10px 28px #071b17aa; }
.agentville-residents-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 3px 4px 8px; }
.agentville-residents-heading strong { font-size: 13px; }
.agentville-residents-heading span { min-width: 0; overflow: hidden; color: #b9d0c2; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.agentville-resident { display: flex; align-items: center; width: 100%; min-height: 43px; gap: 9px; padding: 7px 8px; border: 0; border-top: 1px solid #42665a; color: inherit; background: transparent; cursor: pointer; text-align: left; }
.agentville-resident:first-of-type { border-top: 0; }
.agentville-resident:hover:not(:disabled) { background: #26574a; }
.agentville-resident[data-active] { background: #315f50; box-shadow: inset 3px 0 #e6cc8c; }
.agentville-resident[data-needs-workspace] { color: #d8e4dc; }
.agentville-resident:disabled { cursor: not-allowed; opacity: .55; }
.agentville-resident:focus-visible { outline: 2px solid #e6cc8c; outline-offset: -2px; }
.agentville-resident-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: #9fb8aa; }
.agentville-resident-dot[data-status='working'], .agentville-resident-dot[data-status='thinking'] { background: #e1b75c; }
.agentville-resident-dot[data-status='approval'] { background: #e98d6e; }
.agentville-resident-dot[data-status='completed'] { background: #7ac99a; }
.agentville-resident-dot[data-status='failed'] { background: #e16d6d; }
.agentville-resident-copy { display: grid; min-width: 0; flex: 1; gap: 2px; }
.agentville-resident-copy strong { overflow: hidden; font-size: 12px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.agentville-resident-copy small { color: #b9d0c2; font-size: 11px; }
.agentville-hero-mark { border-radius: 5px; }
span:has(.agentville-hero-mark) + span { font-size: 0; }
span:has(.agentville-hero-mark) + span::after { content: '和 AI 一起学会创造'; font-size: 26px; }
span:has(.agentville-hero-mark) + span + span { font-size: 0; }
span:has(.agentville-hero-mark) + span + span::after { content: 'AI 教育'; font-size: 12px; }
.agentville-prompt { display: grid; gap: 7px; margin: 10px 4px 2px; padding-top: 10px; border-top: 1px solid #42665a; }
.agentville-prompt label { color: #c8dacd; font-size: 11px; }
.agentville-prompt textarea { resize: vertical; min-height: 58px; padding: 8px; border: 1px solid #58796d; border-radius: 5px; color: #f7f0dc; background: #102a25cc; font: inherit; font-size: 12px; line-height: 17px; }
.agentville-prompt textarea:focus-visible { outline: 2px solid #e6cc8c; outline-offset: 1px; }
.agentville-prompt button { justify-self: end; min-height: 30px; padding: 0 12px; border: 1px solid #8ab39e; border-radius: 5px; color: #173b35; background: #d8c27f; cursor: pointer; font: inherit; font-size: 12px; font-weight: 600; }
.agentville-prompt button:disabled { cursor: not-allowed; opacity: .5; }
@media (max-width: 800px) {
  [data-agentville-shell] { --agentville-panel-width: min(420px, 100vw); }
  .agentville-topbar div > span { max-width: 65vw; }
  .agentville-residents { top: auto; right: 12px; bottom: 62px; width: min(280px, calc(100% - 24px)); }
}
`
