export const WORLD_STYLES = `
.town-shell.town-notification-layer { position: fixed; inset: 0; z-index: 45; pointer-events: none; }
.town-notifications { position: absolute; left: 20px; bottom: 20px; z-index: 35; pointer-events: auto; max-width: calc(100vw - 40px); }
.town-shell .town-notification-toggle { display: flex; align-items: center; gap: 6px; min-width: 44px; height: 44px; justify-content: center; border-radius: 50%; box-shadow: 0 2px 10px #17392c22; }
.town-notification-toast, .town-notification-list { width: min(320px, calc(100vw - 40px)); background: #f4f8f3; border: 1px solid #b6c7b8; border-radius: 8px; box-shadow: 0 4px 20px #17392c25; margin-bottom: 8px; }
.town-notification-list { position: absolute; bottom: 48px; left: 0; max-height: 55svh; overflow: auto; padding: 10px; }
.town-notification-toast, .town-notification-item, .town-notification-list header { display: flex; align-items: center; gap: 4px; }
.town-notification-list header { justify-content: space-between; }
.town-notification-item { border-top: 1px solid #d9e0d4; }
.town-shell .town-notifications button { border: 0; }
.town-notification-item > button:first-child, .town-notification-toast > button:first-child { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; text-align: left; }
.town-notifications img { width: 36px; height: 42px; object-fit: contain; flex: none; }
.town-notifications small { display: block; color: #637460; font-size: 11px; }
.town-notifications span { overflow-wrap: anywhere; }
.town-shell[data-conversation] .town-notifications { bottom: auto; top: 80px; }
.town-connection-notice { position: absolute; top: 8px; left: 16px; z-index: 40; padding: 8px 12px; background: #fff3db; border: 1px solid #d8b775; border-radius: 8px; color: #57431e; }
.town-return-island { position: fixed; top: 8px; left: 50%; transform: translateX(-50%); z-index: 50; padding: 7px 14px; border: 1px solid #bccbbb; border-radius: 8px; background: #fcfdf8; color: #203c37; cursor: pointer; }
.town-shell .town-tutorial { display: grid; gap: 10px; padding: 14px; border: 1px solid #b5bca0; border-radius: 12px; background: #fff9e9; color: #29483e; }
.town-shell .town-tutorial > header { display: flex; gap: 12px; align-items: center; justify-content: space-between; }
.town-shell .town-tutorial textarea, .town-shell .town-tutorial input, .town-shell .town-tutorial select { width: 100%; min-width: 0; box-sizing: border-box; padding: 8px; font: inherit; border: 1px solid #869b8f; border-radius: 6px; color: #29483e; background: white; }
.town-shell .town-tutorial textarea { min-height: 90px; resize: vertical; }
.town-shell .town-tutorial button { min-height: 36px; padding: 6px 10px; }
.town-shell .town-tutorial-preview { position: static; width: 100%; height: 320px; border: 1px solid #869b8f; background: white; }
.town-shell .town-tutorial-goal { position: absolute; top: 78px; left: 20px; width: min(290px, calc(100% - 40px)); pointer-events: auto; z-index: 4; }
[data-agent-isles-town] > :not([data-shell-overlay]) { visibility: hidden; pointer-events: none; }
.town-shell { position: absolute; inset: 0; pointer-events: auto; color: #203c37; font: 14px/1.5 "Segoe UI", "Microsoft YaHei", sans-serif; }
.town-shell * { box-sizing: border-box; letter-spacing: 0; }
.town-shell > iframe { width: 100%; height: 100%; border: 0; }
.town-work-entry { position: absolute; top: 20px; left: 20px; max-width: calc(100% - 90px); display: flex; align-items: center; gap: 4px; z-index: 5; }
.town-project-menu { position: relative; min-width: 0; max-width: 100%; }
.town-project-list { position: absolute; top: calc(100% + 8px); left: 0; width: min(320px, calc(100vw - 40px)); max-height: calc(100svh - 100px); overflow-y: auto; padding: 12px; border: 1px solid #aac3b5; border-radius: 10px; background: #fcfdf8; box-shadow: 0 8px 30px #17392c30; }
.town-project-items, .town-project-actions { display: grid; gap: 6px; margin-top: 10px; }
.town-project-actions { border-top: 1px solid #d5dfd4; padding-top: 10px; }
.town-shell .town-project-list button { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; text-align: left; box-shadow: none; }
.town-project-list button span { overflow: hidden; text-overflow: ellipsis; }
.town-project-list button small { flex: none; }
.town-shell .town-project-list button[aria-current] { background: #e1eee5; font-weight: 600; }
.town-work-entry button { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; box-shadow: 0 4px 16px #183a3922; }
[aria-label='居民创作记录'] .town-dialogue-choices { display: grid; grid-template-columns: 1fr; }
[aria-label='居民创作记录'] button { text-align: left; white-space: normal; overflow-wrap: anywhere; }
[aria-label='居民创作记录'] small { display: block; }
.town-guide-tools { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.town-shell a { color: #235950; }
.town-shell button { font: inherit; cursor: pointer; min-height: 36px; border: 1px solid #a8c0b7; border-radius: 6px; padding: 7px 12px; color: #203c37; background: #f4f8f3; }
.town-shell button:hover { background: #e1eee5; }
.town-shell button:disabled { opacity: .55; cursor: not-allowed; }
.town-work-entry .town-project-trigger { display: flex; align-items: center; gap: 9px; height: 44px; padding: 6px 10px 6px 6px; border: 0; border-radius: 8px; background: #f4f8f3e8; box-shadow: 0 2px 10px #17392c12; }
.town-project-trigger img { width: 28px; height: 28px; flex: none; }
.town-project-trigger span { overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
.town-project-trigger svg { flex: none; }
.town-work-entry .town-journal-trigger { position: relative; display: grid; place-items: center; width: 44px; height: 44px; flex: none; padding: 0; border: 0; border-radius: 50%; background: #f4f8f3e8; box-shadow: 0 2px 10px #17392c12; }
.town-journal-status { position: absolute; top: 7px; right: 7px; width: 7px; height: 7px; border: 1px solid #f4f8f3; border-radius: 50%; background: #3d8b73; }
.town-journal-status[data-pending='true'] { background: #c77a32; }
.town-project-location { font-size: 12px; color: #637460; overflow-wrap: anywhere; }
.town-shell .town-tutorial-goal button { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 58px; padding: 6px 10px 6px 4px; text-align: left; border: 0; border-radius: 8px; background: #f4f8f3e8; box-shadow: 0 2px 10px #17392c12; }
.town-tutorial-goal img { width: 42px; height: 46px; object-fit: contain; flex: none; }
.town-tutorial-goal button > span { min-width: 0; flex: 1; }
.town-tutorial-goal small { display: block; font-size: 11px; color: #637460; }
.town-tutorial-goal strong { display: block; font-size: 13px; font-weight: 500; overflow-wrap: anywhere; }
.town-tutorial-goal svg { flex: none; color: #637460; }
.town-work-entry button:focus-visible, .town-tutorial-goal button:focus-visible { outline: 2px solid #286d59; outline-offset: 3px; }
.town-help-reveal { position: absolute; top: 0; right: 0; z-index: 2; width: 112px; height: 84px; display: flex; align-items: flex-start; justify-content: flex-end; padding: 20px; }
.town-help-reveal button { width: 40px; height: 40px; min-height: 40px; padding: 0; border-radius: 50%; font-size: 22px; background: #f7faf5f2; box-shadow: 0 3px 12px #17392c20; opacity: 0; pointer-events: none; }
.town-help-reveal:hover button, .town-help-reveal button:focus-visible { opacity: 1; pointer-events: auto; }
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
.town-files { position: absolute; z-index: 6; inset: 16px 16px 16px auto; width: min(820px, calc(100% - 32px)); display: flex; flex-direction: column; background: #fafcfb; color: #263b37; border: 1px solid #c7d4ce; border-radius: 8px; overflow: hidden; }
.town-files > header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #dce4df; }
.town-files h2 { margin: 4px 0 0; font-size: 20px; }
.town-files h3 { font-size: 15px; }
.town-files small { color: #65736f; }
.town-files button { font: inherit; cursor: pointer; color: inherit; background: transparent; border: 0; border-radius: 4px; min-height: 40px; padding: 8px 12px; display: inline-flex; align-items: center; justify-content: center; gap: 10px; }
.town-files button:hover, .town-files button[aria-pressed='true'] { background: #e1ece8; }
.town-files button:disabled { opacity: .4; cursor: default; }
.town-files button:focus-visible { outline: 2px solid #287a6b; outline-offset: -2px; }
.town-files > nav, .town-files-path { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-bottom: 1px solid #dce4df; }
.town-files > nav > button:last-child { margin-left: auto; }
.town-files-path span { overflow-wrap: anywhere; min-width: 0; font-size: 13px; }
.town-files-content { flex: 1; min-height: 0; overflow: auto; padding: 12px 20px; }
.town-files .town-file-entry { display: flex; justify-content: flex-start; width: 100%; text-align: left; }
.town-file-entry svg { flex: none; }
.town-file-entry span { overflow-wrap: anywhere; min-width: 0; }
.town-files pre { font: 13px/1.6 Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; tab-size: 2; }
@media (max-width: 600px) {
  .town-files { inset: 8px; width: auto; }
  .town-files-content { padding: 12px; }
  .town-shell .town-conversation.town-keeper-dialogue:not(.town-studio):not(.town-work-panel) { bottom: 80px; }
}
.town-work-panel { top: 20px; bottom: 20px; left: auto; right: 20px; transform: none; width: min(440px, calc(100% - 40px)); max-height: none; }
.town-conversation > header { flex: none; padding: 12px 20px 0; justify-content: flex-start; }
.town-portrait { width: 64px; height: 64px; object-fit: contain; flex: none; background: #e6eee0; border-radius: 50%; }
.town-conversation > header > div { flex: 1; min-width: 0; }
.town-conversation > header small { color: #667867; font-size: 12px; }
.town-conversation > header h2 { font-size: 19px; color: #254236; }
.town-conversation > header button { width: auto; height: auto; min-height: 36px; padding: 6px 8px; font-size: 14px; white-space: nowrap; border: 0; background: transparent; align-self: flex-start; }
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
.town-shell { --town-studio-width: clamp(400px, 40vw, 660px); }
.town-shell[data-workspace='expanded'] { --town-studio-width: min(76vw, 1280px); }
.town-shell[data-workspace] > iframe { width: calc(100% - var(--town-studio-width)); }
.town-shell .town-studio { inset: 0 0 0 auto; transform: none; width: var(--town-studio-width); max-height: none; border: 0; border-left: 1px solid #bccbbb; border-radius: 0; background: #f7f8f2; box-shadow: -6px 0 28px #23473712; }
.town-studio > header { padding: 16px 20px 10px; }
.town-studio .town-portrait { width: 44px; height: 44px; }
.town-studio-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 20px 12px; border-bottom: 1px solid #d9e0d4; font-size: 12px; }
.town-studio-toolbar span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.town-studio-toolbar button { flex: none; font-size: 12px; }
.town-studio .town-conversation-body { flex: 1; padding: 16px 20px; }
.town-studio:has(.town-native-chat-seat) .town-conversation-body { flex: none; max-height: 28%; padding: 8px 20px; }
.town-studio .town-results { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; font-size: 12px; color: #637460; }
.town-studio .town-results > [role='alert'] { width: 100%; }
.town-studio .town-results button { min-height: 28px; padding: 3px 8px; font-size: 12px; }
.town-course-disclosure > summary { font-size: 12px; color: #637460; }
.town-shell .town-course-disclosure .town-tutorial { background: transparent; border: 0; padding: 6px 0; }
.town-studio { --dsw-alias-bg-base: #fcfdf8; }
.town-work-story { margin: 16px 0; padding: 16px; border-left: 3px solid #7c9c75; border-radius: 8px; background: #eaf0e3; }
.town-work-story h3 { margin: 8px 0; font-size: 18px; }
.town-work-story p { margin: 8px 0 0; line-height: 1.7; }
.town-work-story small { color: #52694f; }
.town-studio > .town-process-toggle { flex: none; margin: 8px 20px; text-align: left; }
.town-reply { margin: 12px 0; overflow-wrap: anywhere; }
.town-tutorial-hint { margin: 8px 0; font-size: 13px; }
.town-tutorial-hint > summary { color: #52694f; }
.town-chat-menu { position: fixed; inset: auto; margin: 0; width: min(230px, calc(100vw - 16px)); max-height: 60svh; overflow-y: auto; padding: 12px; color: #203c37; background: #fcfdf8; border: 1px solid #bccbbb; border-radius: 8px; box-shadow: 0 6px 24px #203c3722; }
.town-chat-menu:popover-open { display: grid; gap: 6px; }
.town-chat-menu small { overflow-wrap: anywhere; white-space: normal; }
.town-studio:has(.town-native-chat-seat) .town-results { margin: 0; }
.town-studio:has(.town-native-chat-seat) .town-results:empty { display: none; }
.town-native-chat-seat { flex: 1; min-height: 160px; }
.town-handbook section { display: flex; gap: 18px; padding: 20px 0; }
.town-shell .town-conversation.town-work-panel:has(.town-handbook) { bottom: 76px; max-height: calc(100svh - 100px); }
.town-conversation:has(.town-handbook) .town-dialogue-footer { display: none; }
.town-handbook section + section { border-top: 1px solid #d9e0d4; }
.town-handbook section > img { width: 56px; height: 72px; object-fit: contain; flex: none; }
.town-handbook section > div { flex: 1; min-width: 0; }
.town-handbook h3 { font-size: 18px; margin: 0 0 8px; }
.town-handbook p { margin: 0 0 14px; line-height: 1.7; }
.town-handbook button { display: block; margin-top: 8px; max-width: 100%; overflow-wrap: anywhere; text-align: left; }
.town-handbook .town-handbook-note { color: #637460; font-size: 12px; margin: 8px 0; }
.town-history { position: absolute; inset: 12px 12px 12px auto; width: 320px; display: flex; flex-direction: column; pointer-events: auto; background: #fcfdf8; color: #263c35; border: 1px solid #cad5cd; border-radius: 6px; }
.town-history header, .town-history footer { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; min-height: 44px; }
.town-history button { display: inline-flex; align-items: center; gap: 8px; padding: 8px; border: 0; background: transparent; color: inherit; cursor: pointer; font: inherit; }
.town-history button:disabled { opacity: .5; cursor: default; }
.town-history-sidebar { flex: 1; min-height: 0; }
.town-history-chat { position: absolute; right: calc(100% + 12px); top: 0; bottom: 0; width: min(560px, calc(100vw - 368px)); display: flex; flex-direction: column; background: #fcfdf8; border: 1px solid #cad5cd; border-radius: 6px; }
@media (max-width: 760px) {
  .town-history { width: min(320px, calc(100vw - 24px)); }
  .town-history[data-chat] { width: calc(100vw - 24px); }
  .town-history[data-chat] .town-history-sidebar { flex: none; width: 0; height: 0; overflow: hidden; }
  .town-history[data-chat] > header, .town-history[data-chat] > footer { display: none; }
  .town-history-chat { position: static; width: 100%; height: 100%; border: 0; }
}
.town-composer:empty { display: none; }
.town-composer { flex: none; padding: 12px 20px 16px; border-top: 1px solid #d9e0d4; background: #fcfdf8; max-height: 38svh; overflow-y: auto; }
.town-composer form, .town-tutorial-input { display: grid; gap: 8px; margin: 0; }
.town-composer form, .town-composer .town-tutorial-input { grid-template-columns: minmax(0, 1fr) auto; }
.town-composer :is(form,.town-tutorial-input) > * { grid-column: 1 / -1; }
.town-composer :is(form,.town-tutorial-input) > textarea { grid-column: 1; grid-row: 2; min-width: 0; }
.town-composer :is(form,.town-tutorial-input) > button:last-child { grid-column: 2; grid-row: 2; align-self: end; min-width: 52px; min-height: 44px; white-space: nowrap; }
.town-composer :is(textarea,input) { width: 100%; min-height: 64px; max-height: 140px; resize: vertical; padding: 10px; border: 1px solid #b6c7b8; border-radius: 8px; background: white; color: #203c37; font: inherit; }
.town-composer button { justify-self: end; }
.town-composer label { font-size: 12px; color: #52694f; }
.town-shell .town-tutorial { display: grid; gap: 10px; padding: 12px; border: 0; border-left: 3px solid #b8c89e; border-radius: 0 8px 8px 0; background: #edf2e5; color: #29483e; }
.town-tutorial > p { margin: 4px 0; }
.town-course-menu, .town-session-details { font-size: 12px; }
.town-project-preparation[open] { display: grid; gap: 10px; }
.town-results { margin: 0 0 16px; border: 0; }
.town-results > [role='status'] { font-size: 12px; color: #637460; }
.town-current-line { font-size: 15px; line-height: 1.75; }
.town-results .town-current-line { padding: 0; border: 0; }
.town-current-line p { margin: 8px 0 14px; }
.town-conversation summary { cursor: pointer; padding: 6px 0; }
.town-guide-tools { margin-top: 16px; }
.town-approval { background: #fff3db; border: 1px solid #d8b775; border-radius: 8px; padding: 12px; }
.town-approval pre { white-space: pre-wrap; overflow-wrap: anywhere; }
.town-shell .town-conversation:not(.town-studio):not(.town-work-panel) { width: min(580px, calc(100% - 32px)); max-height: 45svh; bottom: 24px; border-radius: 16px; background: #fcfdf8fa; }
.town-conversation:not(.town-studio) .town-dialogue-choices { gap: 4px 16px; }
.town-conversation:not(.town-studio) .town-dialogue-choices button { border: 0; background: transparent; color: #326b50; padding: 8px 4px; min-height: 44px; }
.town-conversation:not(.town-studio) .town-dialogue-choices button:hover { background: #e6eee0; }
.town-shell[data-workspace='expanded'] .town-tutorial-preview { height: 48svh; }
.town-preview-pane:empty { display: none; }
.town-shell[data-workspace]:has(.town-preview-pane:not(:empty)) { --town-studio-width: min(80vw, 1440px); }
.town-studio:has(.town-preview-pane:not(:empty)) { display: grid; grid-template-columns: minmax(280px, .85fr) minmax(340px, 1.15fr); grid-template-rows: auto auto minmax(0, 1fr) auto; }
.town-studio:has(.town-preview-pane:not(:empty)) > :is(header,.town-studio-toolbar) { grid-column: 1 / -1; }
.town-studio:has(.town-preview-pane:not(:empty)) > .town-conversation-body { grid-column: 1; grid-row: 3; }
.town-studio:has(.town-preview-pane:not(:empty)) > .town-composer { grid-column: 1; grid-row: 4; }
.town-studio:has(.town-preview-pane:not(:empty)):has(.town-native-chat-seat) { grid-template-rows: auto auto auto minmax(0, 1fr) auto; }
.town-studio:has(.town-preview-pane:not(:empty)) > .town-native-chat-seat { grid-column: 1; grid-row: 4; }
.town-studio:has(.town-preview-pane:not(:empty)):has(.town-native-chat-seat) > .town-composer { grid-row: 5; }
.town-studio:has(.town-native-chat-seat) > .town-preview-pane { grid-row: 3 / 6; }
.town-preview-pane { grid-column: 2; grid-row: 3 / 5; min-height: 0; display: flex; flex-direction: column; gap: 10px; padding: 12px; border-left: 1px solid #d9e0d4; }
.town-preview-pane > button { align-self: start; }
.town-shell .town-preview-pane > iframe { flex: 1; width: 100%; min-height: 0; height: 100%; border: 1px solid #d9e0d4; background: white; }
@media (max-width: 800px) {
  .town-shell[data-workspace] > iframe { width: 100%; height: 24svh; }
  .town-shell[data-workspace] .town-studio { inset: 24svh 0 0; width: 100%; max-height: none; transform: none; border-left: 0; border-top: 1px solid #bccbbb; }
  .town-studio > header { padding: 10px 14px 6px; }
  .town-studio-toolbar { padding: 0 14px 8px; }
  .town-studio .town-conversation-body { padding: 12px 14px; }
  .town-composer { padding: 10px 14px; }
  .town-shell[data-workspace='expanded'] > iframe { height: 0; }
  .town-shell[data-workspace='expanded'] .town-studio { top: 0; }
  .town-shell[data-workspace] .town-studio:has(.town-preview-pane:not(:empty)) { display: flex; }
  .town-studio:has(.town-preview-pane:not(:empty)) > :is(.town-conversation-body,.town-composer) { display: none; }
  .town-studio:has(.town-preview-pane:not(:empty)) > .town-native-chat-seat { display: none; }
  .town-preview-pane { flex: 1; border-left: 0; }
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
