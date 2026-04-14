import { colors } from './theme';
import { Highlight } from './db';

export function getReaderStyles(fontSize: number, defaultColor: string): string {
  return `
* { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: ${fontSize}px;
  line-height: 1.75;
  color: ${colors.textPrimary};
  padding: 20px;
  padding-bottom: 60px;
  margin: 0;
  word-break: break-word;
  overflow-wrap: break-word;
}
#content {
  -webkit-user-select: text;
  user-select: text;
}
h1.title {
  font-size: ${fontSize + 6}px;
  font-weight: 700;
  color: ${colors.textPrimary};
  line-height: 1.3;
  margin: 0 0 24px;
}
p { margin: 0 0 14px; }
blockquote {
  border-left: 3px solid ${colors.primary};
  padding-left: 12px;
  color: ${colors.textMuted};
  margin: 0 0 14px;
}
a { color: ${colors.primary}; text-decoration: none; }
h1, h2, h3, h4 { color: ${colors.textPrimary}; margin: 20px 0 8px; }
h1.title ~ * h1 { font-size: 1.4em; }
img { max-width: 100%; height: auto; display: block; margin: 12px auto; border-radius: 4px; }
figure { margin: 0 0 14px; }
pre, code { font-size: 0.88em; background: ${colors.bgMuted}; border-radius: 4px; }
pre { padding: 12px; overflow-x: auto; }
code { padding: 1px 4px; }
mark { border-radius: 2px; padding: 0 1px; cursor: pointer; }
#toolbar {
  position: absolute;
  display: none;
  background: #1a1a1a;
  border-radius: 10px;
  padding: 6px;
  flex-direction: row;
  align-items: center;
  z-index: 9999;
  box-shadow: 0 4px 16px rgba(0,0,0,0.35);
}
#toolbar.visible { display: flex; }
#save-btn, #del-btn {
  width: 36px; height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  font-size: 22px;
  cursor: pointer;
  user-select: none;
}
#save-btn { background: ${defaultColor}; color: #000; }
#del-btn { background: ${colors.error}; color: #fff; display: none; }
`;
}

export function getReaderScript(highlightsJson: string, defaultColorJson: string): string {
  return `
(function() {
var CONTEXT = 30;
var toolbar = document.getElementById('toolbar');
var saveBtn = document.getElementById('save-btn');
var delBtn = document.getElementById('del-btn');
var pending = null;
var activeMark = null;
var defaultColor = ${defaultColorJson};

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
    var txt = ns[i].textContent.replace(/\u00a0/g, ' ');
    map.push({ n: ns[i], s: full.length });
    full += txt;
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
  var t = text.replace(/\u00a0/g, ' ');
  var cb = ctxBefore.replace(/\u00a0/g, ' ');
  var search = cb + t;
  var idx = tm.full.indexOf(search);
  var start = idx === -1 ? tm.full.indexOf(t) : idx + cb.length;
  if (start === -1) return false;
  var end = start + t.length;
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
    } catch(e) { console.error(e) }
  }
}

function captureFromSel() {
  var sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !sel.toString().trim()) {
    if (!activeMark) dismissToolbar();
    return;
  }
  try {
    var range = sel.getRangeAt(0);
    if (!document.getElementById('content').contains(range.commonAncestorContainer)) return;

    var text = sel.toString().trim();
    var content = document.getElementById('content');
    var preR = document.createRange();
    preR.selectNodeContents(content);
    preR.setEnd(range.startContainer, range.startOffset);
    var postR = document.createRange();
    postR.selectNodeContents(content);
    postR.setStart(range.endContainer, range.endOffset);
    pending = {
      text: text.replace(/\u00a0/g, ' '),
      ctxBefore: preR.toString().slice(-CONTEXT).replace(/\u00a0/g, ' '),
      ctxAfter: postR.toString().slice(0, CONTEXT).replace(/\u00a0/g, ' ')
    };
    activeMark = null;
    showSaveBtn();
    positionToolbar(range.getBoundingClientRect());
  } catch(e) { console.error(e) }
}
var selTimer;
document.addEventListener('selectionchange', function() {
  var sel = window.getSelection();
  if (sel && !sel.isCollapsed && sel.toString().trim()) {
    clearTimeout(selTimer);
    selTimer = setTimeout(captureFromSel, 250);
  }
});
document.addEventListener('touchend', function(e) {
  if (toolbar.contains(e.target)) return;
  clearTimeout(selTimer);
  captureFromSel();
});

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
  var top = rect.bottom + window.scrollY + 12;
  var left = rect.left + (rect.width / 2) - 24;
  left = Math.max(10, Math.min(left, window.innerWidth - 58));
  toolbar.style.top = top + 'px';
  toolbar.style.left = left + 'px';
  toolbar.classList.add('visible');
}

function showSaveBtn() {
  saveBtn.style.display = 'flex';
  delBtn.style.display = 'none';
}

function showDeleteBtn() {
  saveBtn.style.display = 'none';
  delBtn.style.display = 'flex';
}

function dismissToolbar() {
  toolbar.classList.remove('visible');
  showSaveBtn();
  pending = null;
  activeMark = null;
}

function applyHL(color) {
  if (!pending) return;
  var id = 'hl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  var ok = findAndWrap(pending.text, pending.ctxBefore, pending.ctxAfter, id, color);
  if (!ok) { dismissToolbar(); return; }
  window.getSelection().removeAllRanges();
  var msg = { type: 'highlight', id: id, text: pending.text, contextBefore: pending.ctxBefore, contextAfter: pending.ctxAfter };
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

window.scrollToHighlight = function(id) {
  var el = document.querySelector('mark[data-id="' + id + '"]');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var old = el.style.backgroundColor;
    el.style.backgroundColor = '${colors.white}';
    el.style.outline = '2px solid ' + defaultColor;
    setTimeout(function() { el.style.backgroundColor = old; el.style.outline = 'none'; }, 800);
  }
};

saveBtn.addEventListener('touchend', function(e) { e.preventDefault(); applyHL(defaultColor); });
saveBtn.addEventListener('click', function() { applyHL(defaultColor); });
delBtn.addEventListener('touchend', function(e) { e.preventDefault(); deleteMark(); });
delBtn.addEventListener('click', deleteMark);

injectHighlights(${highlightsJson});
})();
`;
}

export function buildReaderHtml(
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
<style>${getReaderStyles(fontSize, defaultColor)}</style>
</head>
<body>
<h1 class="title">${escapedTitle}</h1>
<div id="content">${content}</div>
<div id="toolbar" onmousedown="event.preventDefault()">
  <div id="save-btn">&#x270E;</div>
  <div id="del-btn">&#x2715;</div>
</div>
<script>${getReaderScript(highlightsJson, defaultColorJson)}</script>
</body>
</html>`;
}