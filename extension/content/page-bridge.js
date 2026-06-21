/**
 * ResumeATS-X — Page Bridge (MAIN world)
 *
 * Runs in the page's own JS context so it can reach CodeMirror 6
 * internals (cmView). Communicates with the ISOLATED-world content
 * script exclusively via window.postMessage.
 */
(() => {
  'use strict';

  /** How long to wait for the CM editor before giving up (ms) */
  const EDITOR_WAIT_TIMEOUT = 15_000;

  /* ------------------------------------------------------------------ */
  /*  Wait for CodeMirror editor to appear in the DOM                   */
  /* ------------------------------------------------------------------ */
  let editorReady = false;

  const waitForEditor = () =>
    new Promise((resolve, reject) => {
      // Already present?
      const existing = document.querySelector('.cm-editor');
      if (existing) {
        editorReady = true;
        return resolve(existing);
      }

      const timer = setTimeout(() => {
        observer.disconnect();
        reject(new Error('Timed out waiting for CodeMirror editor'));
      }, EDITOR_WAIT_TIMEOUT);

      const observer = new MutationObserver((_mutations, obs) => {
        const el = document.querySelector('.cm-editor');
        if (el) {
          clearTimeout(timer);
          obs.disconnect();
          editorReady = true;
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    });

  // Kick off the wait immediately (fire-and-forget; we track editorReady)
  waitForEditor().catch((err) => {
    console.warn('[ResumeATS-X page-bridge]', err.message);
  });

  /* ------------------------------------------------------------------ */
  /*  Extract full document text from CodeMirror 6                      */
  /* ------------------------------------------------------------------ */
  const extractLatexText = () => {
    try {
      const cmContent = document.querySelector('.cm-content');
      if (!cmContent) return { ok: false, error: 'cm-content element not found' };

      // CodeMirror 6 attaches a cmView property to .cm-content
      const view = cmContent?.cmView?.view;
      if (!view) return { ok: false, error: 'CodeMirror view not accessible' };

      const docText = view.state.doc.toString();
      if (!docText || docText.trim().length === 0) {
        return { ok: false, error: 'Document is empty' };
      }

      return { ok: true, text: docText };
    } catch (err) {
      return { ok: false, error: `Extraction failed: ${err.message}` };
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Message listener — respond to requests from content.js            */
  /* ------------------------------------------------------------------ */
  window.addEventListener('message', (event) => {
    // Only accept messages from our own window
    if (event.source !== window) return;
    if (event.data?.type !== 'RATSX_REQUEST_TEXT') return;

    if (!editorReady) {
      window.postMessage({
        type: 'RATSX_LATEX_TEXT',
        ok: false,
        error: 'Editor not ready yet — please wait for Overleaf to fully load.',
      });
      return;
    }

    const result = extractLatexText();

    window.postMessage({
      type: 'RATSX_LATEX_TEXT',
      ok: result.ok,
      text: result.text ?? null,
      error: result.error ?? null,
    });
  });

  console.log('[ResumeATS-X page-bridge] Loaded in MAIN world');
})();
