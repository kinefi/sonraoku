import { FontFamily, ThemeColors } from '@/lib/theme';
import { Highlight } from '@/lib/db';

/**
 * CSS injected into the reader WebView to style the article and the custom selection menu.
 */
export const getReaderStyles = (
  fontSize: number,
  fontFamily: FontFamily,
  themeColors: ThemeColors,
  highlightColor: string
) => {
  return `
    body {
      font-size: ${fontSize}px;
      line-height: 1.6;
      color: ${themeColors.textPrimary};
      background-color: ${themeColors.bgPage};
      padding: 20px;
      font-family: ${fontFamily === 'serif' ? 'serif' : 'sans-serif'};
      margin: 0;
      overflow-x: hidden;
    }
    img { max-width: 100%; height: auto; border-radius: 8px; }
    blockquote { border-left: 4px solid ${themeColors.primary}; padding-left: 16px; font-style: italic; }
    
    /* Hanging Highlight Button */
    #highlight-floating-btn {
      position: absolute;
      display: none;
      background-color: ${highlightColor};
      border-radius: 50%;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 8px rgba(0,0,0,0.4);
      z-index: 10000;
      pointer-events: auto;
      border: none;
    }

    #delete-highlight-btn {
      position: absolute;
      display: none;
      background-color: ${themeColors.error};
      border-radius: 50%;
      width: 44px;
      height: 44px;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 8px rgba(0,0,0,0.4);
      z-index: 10001;
      border: none;
    }
    
    /* Highlight styles */
    mark {
      background-color: ${highlightColor}66;
      border-bottom: 2px solid ${highlightColor};
      color: inherit;
    }
  `;
};

/**
 * JavaScript injected into the reader WebView to handle text selection and the toolbar.
 */
export const getReaderJS = (highlightsJson: string) => `
  (function() {
    let activeHighlightId = null;
    const btn = document.createElement('button');
    btn.id = 'highlight-floating-btn';
    btn.innerHTML = \`
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
      </svg>
    \`;
    document.body.appendChild(btn);

    const delBtn = document.createElement('button');
    delBtn.id = 'delete-highlight-btn';
    delBtn.innerHTML = \`
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    \`;
    document.body.appendChild(delBtn);

    // --- Highlight Injection Logic ---
    function buildTextMap(root) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let fullText = "";
      const map = [];
      let node;
      while ((node = walker.nextNode())) {
        map.push({ node, start: fullText.length });
        fullText += node.textContent;
      }
      return { fullText, map };
    }

    function findNodeAt(map, pos) {
      for (let i = map.length - 1; i >= 0; i--) {
        if (map[i].start <= pos) return { node: map[i].node, offset: pos - map[i].start };
      }
      return null;
    }

    window.applyHighlights = function(highlights) {
      const content = document.getElementById('reader-content');
      if (!content || !highlights || highlights.length === 0) return;

      // Clear existing highlights to prevent duplication and index shifting
      const existingMarks = content.getElementsByTagName('mark');
      while (existingMarks.length > 0) {
        const m = existingMarks[0];
        const p = m.parentNode;
        if (p) {
          while (m.firstChild) p.insertBefore(m.firstChild, m);
          p.removeChild(m);
        }
      }
      content.normalize();

      const normalize = (s) => (s || '').replace(/\s+/g, ' ').trim();

      highlights.forEach(h => {
        // Re-calculate text map every time because previous highlights split text nodes
        const { fullText, map } = buildTextMap(content);

        const targetText = h.selected_text;
        let startIdx = -1;
        let minDiff = Infinity;

        const normBefore = normalize(h.context_before);
        const normAfter = normalize(h.context_after);

        // Find best matching occurrence by checking surrounding context
        let lastIdx = 0;
        while ((lastIdx = fullText.indexOf(targetText, lastIdx)) !== -1) {
          const actualBefore = fullText.substring(Math.max(0, lastIdx - 60), lastIdx);
          const actualAfter = fullText.substring(lastIdx + targetText.length, lastIdx + targetText.length + 60);
          
          // Simple fuzzy check: how well does the surrounding text match stored context?
          const diff = (normBefore ? (normalize(actualBefore).includes(normBefore) ? 0 : 1) : 0) +
                       (normAfter ? (normalize(actualAfter).includes(normAfter) ? 0 : 1) : 0);

          if (diff < minDiff) {
            minDiff = diff;
            startIdx = lastIdx;
          }
          
          if (diff === 0) break; // Perfect match found
          lastIdx += 1;
        }

        if (startIdx === -1) return;

        const endIdx = startIdx + targetText.length;
        const startPos = findNodeAt(map, startIdx);
        const endPos = findNodeAt(map, endIdx);

        if (startPos && endPos) {
          const range = document.createRange();
          range.setStart(startPos.node, startPos.offset);
          range.setEnd(endPos.node, endPos.offset);
          
          const mark = document.createElement('mark');
          mark.id = 'highlight-' + h.id;
          mark.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            activeHighlightId = h.id;
            
            delBtn.style.display = 'flex';
            btn.style.display = 'none';
            
            // Position button exactly at tap coordinates
            const btnWidth = 44;
            const btnHeight = 44;
            let top = e.pageY + 15;
            // Flip to top if too close to the bottom of the visible screen
            if (top + btnHeight > window.innerHeight + window.scrollY - 10) top = e.pageY - btnHeight - 15;
            
            let left = e.pageX - (btnWidth / 2);
            left = Math.max(10, Math.min(left, window.innerWidth - btnWidth - 10));
            
            delBtn.style.top = top + 'px';
            delBtn.style.left = left + 'px';
          };
          try {
            range.surroundContents(mark);
          } catch (e) {
            // Handle ranges spanning multiple nodes
            const contents = range.extractContents();
            mark.appendChild(contents);
            range.insertNode(mark);
          }
        }
      });
    };

    // Initial Application
    const runSetup = () => {
      window.applyHighlights(${highlightsJson});
    };

    if (document.readyState === 'complete') {
      runSetup();
    } else {
      window.addEventListener('load', runSetup);
    }

    // --- Selection & Toolbar Logic ---
    function getSelectionContext(selection) {
      const range = selection.getRangeAt(0);
      const startNode = range.startContainer;
      const content = document.getElementById('reader-content');
      const { fullText, map } = buildTextMap(content);
      
      // Find actual offset in the full text map to get accurate context
      let startOffset = 0;
      if (startNode.nodeType === Node.TEXT_NODE) {
        for (let i = 0; i < map.length; i++) {
          if (map[i].node === startNode) {
            startOffset = map[i].start + range.startOffset;
            break;
          }
        }
      } else {
        // Fallback for non-text nodes
        startOffset = fullText.indexOf(selection.toString());
      }

      const selectedText = selection.toString();
      const contextBefore = fullText.substring(Math.max(0, startOffset - 50), startOffset);
      const contextAfter = fullText.substring(startOffset + selectedText.length, startOffset + selectedText.length + 50);
      
      return { selectedText, contextBefore, contextAfter };
    }

    function updateToolbar() {
      const selection = window.getSelection();
      if (!selection.rangeCount || selection.isCollapsed) {
        btn.style.display = 'none';
        return;
      }
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0) {
        btn.style.display = 'none';
        return;
      }

      // Check if selection overlaps with existing highlights
      const isInsideMark = (node) => {
        if (!node) return false;
        const el = node.nodeType === 1 ? node : node.parentElement;
        return el && typeof el.closest === 'function' && el.closest('mark');
      };
      if (isInsideMark(range.startContainer) || isInsideMark(range.endContainer) || range.cloneContents().querySelector('mark')) {
        btn.style.display = 'none';
        return;
      }

      // If we are starting a new selection, hide the delete button
      delBtn.style.display = 'none';
      activeHighlightId = null;

      btn.style.display = 'flex';
      const btnRect = btn.getBoundingClientRect();
      let top = rect.bottom + window.scrollY + 12;
      let left = rect.left + window.scrollX + (rect.width / 2) - (btnRect.width / 2);
      left = Math.max(10, Math.min(left, window.innerWidth - btnRect.width - 10));
      btn.style.top = top + 'px';
      btn.style.left = left + 'px';
    }

    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const selection = window.getSelection();
      const data = getSelectionContext(selection);
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'highlight',
        id: 'hl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        text: data.selectedText,
        contextBefore: data.contextBefore,
        contextAfter: data.contextAfter
      }));
      selection.removeAllRanges();
      updateToolbar();
    };

    delBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (activeHighlightId) {
        // Remove from DOM immediately for "direct" feedback
        const mark = document.getElementById('highlight-' + activeHighlightId);
        if (mark) {
          const parent = mark.parentNode;
          if (parent) {
            while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
            parent.removeChild(mark);
            parent.normalize();
          }
        }

        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'delete-highlight',
          id: activeHighlightId
        }));
      }
      delBtn.style.display = 'none';
      activeHighlightId = null;
    };

    document.addEventListener('selectionchange', updateToolbar);
    
    // Prevent touch events on buttons from bubbling to document and hiding the menu
    const stopEvt = (e) => e.stopPropagation();
    btn.addEventListener('touchstart', stopEvt);
    delBtn.addEventListener('touchstart', stopEvt);

    document.addEventListener('touchstart', (e) => { 
      if (!btn.contains(e.target) && !delBtn.contains(e.target) && !e.target.closest('mark')) {
        updateToolbar();
        delBtn.style.display = 'none';
        activeHighlightId = null;
      }
    });

    var lastScroll = 0;
    window.addEventListener('scroll', function() {
      var now = Date.now();
      if (now - lastScroll < 32) return;
      lastScroll = now;
      var scrollable = document.body.scrollHeight - window.innerHeight;
      if (scrollable > 0) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ 
          type: 'scroll', 
          progress: window.scrollY / scrollable 
        }));
      }
    });
  })();
`;

export const getReaderSettingsScript = (
  fontSize: number,
  fontFamily: FontFamily,
  highlights: Highlight[],
  themeColors: ThemeColors
) => {
  const highlightsJson = JSON.stringify(highlights);
  return `
    document.body.style.fontSize = '${fontSize}px';
    document.body.style.fontFamily = '${fontFamily === 'serif' ? 'serif' : 'sans-serif'}';
    document.body.style.backgroundColor = '${themeColors.bgPage}';
    document.body.style.color = '${themeColors.textPrimary}';
    if (window.applyHighlights) {
      window.applyHighlights(${highlightsJson});
    }
    true;
  `;
};

export const buildReaderHtml = (
  title: string,
  content: string,
  fontSize: number,
  fontFamily: FontFamily,
  highlightColor: string,
  highlights: Highlight[],
  themeColors: ThemeColors
) => {
  const highlightsJson = JSON.stringify(highlights);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>${getReaderStyles(fontSize, fontFamily, themeColors, highlightColor)}</style>
    </head>
    <body>
      <h1>${title}</h1>
      <div id="reader-content">${content}</div>
      <script>${getReaderJS(highlightsJson)}</script>
      <script>
        window.scrollToProgress = function(p) {
          const scrollable = document.body.scrollHeight - window.innerHeight;
          if (scrollable > 0) {
            window.scrollTo(0, p * scrollable);
          }
        };
        window.scrollToHighlight = function(id) {
          const el = document.getElementById('highlight-' + id);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.backgroundColor = '${highlightColor}66';
            setTimeout(() => { el.style.backgroundColor = '${highlightColor}44'; }, 2000);
          }
        };
      </script>
    </body>
    </html>
  `;
};