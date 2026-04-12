import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Highlight } from '../lib/db';

export type ReaderMessage =
  | { type: 'highlight'; text: string; contextBefore: string; contextAfter: string }
  | { type: 'delete-highlight'; id: string };

type Props = {
  html: string;
  title: string;
  fontSize: number;
  defaultColor: string;
  highlights: Highlight[];
  onMessage: (msg: ReaderMessage) => void;
  onScrollProgress: (progress: number) => void;
};

function buildReaderHtml(
  title: string,
  content: string,
  fontSize: number,
  defaultColor: string,
  highlights: Highlight[]
): string {
  const escapedTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const highlightsJson = JSON.stringify(highlights);
  const defaultColorJson = JSON.stringify(defaultColor);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
<style>
* { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: ${fontSize}px;
  line-height: 1.75;
  color: #222;
  padding: 20px;
  padding-bottom: 60px;
  margin: 0;
  word-break: break-word;
  overflow-wrap: break-word;
}
h1.title {
  font-size: ${fontSize + 6}px;
  font-weight: 700;
  color: #111;
  line-height: 1.3;
  margin: 0 0 24px;
}
p { margin: 0 0 14px; }
blockquote {
  border-left: 3px solid #534AB7;
  padding-left: 12px;
  color: #555;
  margin: 0 0 14px;
}
a { color: #534AB7; text-decoration: none; }
h1, h2, h3, h4 { color: #111; margin: 20px 0 8px; }
h1.title ~ * h1 { font-size: 1.4em; }
img { max-width: 100%; height: auto; display: block; margin: 12px auto; border-radius: 4px; }
figure { margin: 0 0 14px; }
pre, code { font-size: 0.88em; background: #f4f4f4; border-radius: 4px; }
pre { padding: 12px; overflow-x: auto; }
code { padding: 1px 4px; }
mark { border-radius: 2px; padding: 0 1px; cursor: pointer; }
#toolbar {
  position: fixed;
  display: none;
  background: #1a1a1a;
  border-radius: 10px;
  padding: 8px 10px;
  gap: 10px;
  flex-direction: row;
  align-items: center;
  z-index: 9999;
  box-shadow: 0 4px 16px rgba(0,0,0,0.35);
}
#toolbar.visible { display: flex; }
.cbtn {
  width: 26px; height: 26px;
  border-radius: 13px;
  border: 2.5px solid rgba(255,255,255,0.2);
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.1s;
}
.cbtn.default-color { border-color: rgba(255,255,255,0.9); }
#del-btn {
  color: #ff6b6b;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 0 2px;
  user-select: none;
  display: none;
}
</style>
</head>
<body>
<h1 class="title">${escapedTitle}</h1>
<div id="content">${content}</div>
<div id="toolbar" onmousedown="event.preventDefault()">
  <div class="cbtn" data-color="#FFE066" style="background:#FFE066"></div>
  <div class="cbtn" data-color="#A8F0C0" style="background:#A8F0C0"></div>
  <div class="cbtn" data-color="#A8C8F8" style="background:#A8C8F8"></div>
  <div class="cbtn" data-color="#F8A8C8" style="background:#F8A8C8"></div>
  <span id="del-btn">&#x2715;</span>
</div>
<script>
(function() {
var CONTEXT = 30;
var toolbar = document.getElementById('toolbar');
var delBtn = document.getElementById('del-btn');
var colorBtns = toolbar.querySelectorAll('.cbtn');
var pending = null;
var activeMark = null;
var defaultColor = ${defaultColorJson};

function markDefaultBtn() {
  for (var i = 0; i < colorBtns.length; i++) {
    colorBtns[i].classList.toggle('default-color', colorBtns[i].dataset.color === defaultColor);
  }
}
markDefaultBtn();

function send(msg) {
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(msg));
}

window.addEventListener('scroll', function() {
  var scrollable = document.body.scrollHeight - window.innerHeight;
  if (scrollable > 0) send({ type: 'scroll', progress: window.scrollY / scrollable });
});

function textNodes(root) {
  var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  var ns = [], n;
  while ((n = w.nextNode())) ns.push(n);
  return ns;
}

function buildMap(root) {
  var ns = textNodes(root);
  var full = '', map = [];
  for (var i = 0; i < ns.length; i++) {
    map.push({ n: ns[i], s: full.length });
    full += ns[i].textContent;
  }
  return { full: full, map: map };
}

function nodeAt(map, pos) {
  for (var i = map.length - 1; i >= 0; i--) {
    var m = map[i];
    if (m.s <= pos && pos < m.s + m.n.textContent.length) return { n: m.n, off: pos - m.s };
  }
  return null;
}

function wrapRange(range, id, color) {
  var mark = document.createElement('mark');
  mark.style.backgroundColor = color;
  if (id) mark.dataset.id = id;
  mark.addEventListener('click', onMarkClick);
  try {
    range.surroundContents(mark);
  } catch (e) {
    var frag = range.extractContents();
    mark.appendChild(frag);
    range.insertNode(mark);
  }
}

function findAndWrap(text, ctxBefore, ctxAfter, id, color) {
  var content = document.getElementById('content');
  var tm = buildMap(content);
  var search = ctxBefore + text;
  var idx = tm.full.indexOf(search);
  var start = idx === -1 ? tm.full.indexOf(text) : idx + ctxBefore.length;
  if (start === -1) return false;
  var end = start + text.length;
  var sn = nodeAt(tm.map, start);
  var en = nodeAt(tm.map, end - 1);
  if (!sn || !en) return false;
  var range = document.createRange();
  range.setStart(sn.n, sn.off);
  range.setEnd(en.n, en.off + 1);
  wrapRange(range, id, color);
  return true;
}

function injectHighlights(hs) {
  for (var i = 0; i < hs.length; i++) {
    try {
      findAndWrap(hs[i].selected_text, hs[i].context_before, hs[i].context_after, hs[i].id, defaultColor);
    } catch (e) {}
  }
}

// Capture selection and show toolbar immediately (synchronous).
// On Android the native selection can be cleared within milliseconds of touchend,
// so we must read getSelection() synchronously rather than deferring to a timer.
function captureFromSel() {
  var sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.toString().trim()) return;
  try {
    var range = sel.getRangeAt(0);
    var text = sel.toString().trim();
    var content = document.getElementById('content');
    var preR = document.createRange();
    preR.selectNodeContents(content);
    preR.setEnd(range.startContainer, range.startOffset);
    var postR = document.createRange();
    postR.selectNodeContents(content);
    postR.setStart(range.endContainer, range.endOffset);
    pending = {
      text: text,
      ctxBefore: preR.toString().slice(-CONTEXT),
      ctxAfter: postR.toString().slice(0, CONTEXT)
    };
    activeMark = null;
    showColorBtns();
    positionToolbar(range.getBoundingClientRect());
  } catch(e) {}
}
var selTimer;
// selectionchange fires many times while handles are dragged — debounce for desktop
document.addEventListener('selectionchange', function() {
  var sel = window.getSelection();
  if (sel && !sel.isCollapsed && sel.toString().trim()) {
    clearTimeout(selTimer);
    selTimer = setTimeout(captureFromSel, 250);
  }
});
// touchend: capture synchronously — the moment the finger lifts is the last reliable
// instant where getSelection() is still populated on Android WebView
document.addEventListener('touchend', function(e) {
  if (toolbar.contains(e.target)) return;
  clearTimeout(selTimer);
  captureFromSel();
});
document.addEventListener('contextmenu', function(e) { e.preventDefault(); });

document.addEventListener('click', function(e) {
  if (!toolbar.contains(e.target) && e.target.tagName !== 'MARK') dismissToolbar();
});

function onMarkClick(e) {
  e.stopPropagation();
  activeMark = e.currentTarget;
  pending = null;
  showDeleteBtn();
  var r = document.createRange();
  r.selectNodeContents(activeMark);
  positionToolbar(r.getBoundingClientRect());
}

function positionToolbar(rect) {
  var top = rect.top + window.scrollY - 50;
  if (top < window.scrollY + 10) top = rect.bottom + window.scrollY + 10;
  var left = Math.max(10, Math.min(rect.left, window.innerWidth - 200));
  toolbar.style.top = top + 'px';
  toolbar.style.left = left + 'px';
  toolbar.classList.add('visible');
}

function showColorBtns() {
  for (var i = 0; i < colorBtns.length; i++) colorBtns[i].style.display = '';
  delBtn.style.display = 'none';
}

function showDeleteBtn() {
  for (var i = 0; i < colorBtns.length; i++) colorBtns[i].style.display = 'none';
  delBtn.style.display = 'inline';
}

function dismissToolbar() {
  toolbar.classList.remove('visible');
  showColorBtns();
  pending = null;
  activeMark = null;
}

function applyHL(color) {
  if (!pending) return;
  var ok = findAndWrap(pending.text, pending.ctxBefore, pending.ctxAfter, null, color);
  if (!ok) { dismissToolbar(); return; }
  window.getSelection().removeAllRanges();
  var msg = { type: 'highlight', text: pending.text, contextBefore: pending.ctxBefore, contextAfter: pending.ctxAfter };
  dismissToolbar();
  send(msg);
}

function deleteMark() {
  if (!activeMark) return;
  var id = activeMark.dataset.id;
  var parent = activeMark.parentNode;
  while (activeMark.firstChild) parent.insertBefore(activeMark.firstChild, activeMark);
  parent.removeChild(activeMark);
  dismissToolbar();
  send({ type: 'delete-highlight', id: id });
}

for (var i = 0; i < colorBtns.length; i++) {
  (function(btn) {
    // touchend fires before click and prevents the synthesized click on Android,
    // ensuring applyHL runs exactly once even if the selection is cleared by then
    btn.addEventListener('touchend', function(e) { e.preventDefault(); applyHL(btn.dataset.color); });
    btn.addEventListener('click', function() { applyHL(btn.dataset.color); });
  })(colorBtns[i]);
}
delBtn.addEventListener('touchend', function(e) { e.preventDefault(); deleteMark(); });
delBtn.addEventListener('click', deleteMark);

injectHighlights(${highlightsJson});
})();
</script>
</body>
</html>`;
}

export default function ReaderView({
  html,
  title,
  fontSize,
  defaultColor,
  highlights,
  onMessage,
  onScrollProgress,
}: Props) {
  const webViewRef = useRef<WebView>(null);
  const loaded = useRef(false);

  const source = useMemo(
    () => ({ html: buildReaderHtml(title, html, fontSize, defaultColor, highlights) }),
    // highlights intentionally omitted — WebView manages visual state after initial render;
    // fontSize intentionally omitted — changes are injected via JS to preserve scroll position
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [html, title, defaultColor]
  );

  // Inject font size changes without reloading the WebView
  useEffect(() => {
    if (!loaded.current) return;
    webViewRef.current?.injectJavaScript(
      `document.body.style.fontSize='${fontSize}px';` +
        `var t=document.querySelector('h1.title');if(t)t.style.fontSize='${fontSize + 6}px';true;`
    );
  }, [fontSize]);

  function handleMessage(e: WebViewMessageEvent) {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === 'scroll') {
        onScrollProgress(data.progress as number);
      } else {
        onMessage(data as ReaderMessage);
      }
    } catch {
      // ignore malformed messages
    }
  }

  return (
    <WebView
      ref={webViewRef}
      style={styles.webView}
      source={source}
      javaScriptEnabled
      originWhitelist={['*']}
      showsVerticalScrollIndicator={false}
      onLoadEnd={() => {
        loaded.current = true;
        webViewRef.current?.injectJavaScript(
          `document.body.style.fontSize='${fontSize}px';` +
          `var t=document.querySelector('h1.title');if(t)t.style.fontSize='${fontSize + 6}px';true;`
        );
      }}
      onMessage={handleMessage}
    />
  );
}

const styles = StyleSheet.create({
  webView: { flex: 1 },
});
