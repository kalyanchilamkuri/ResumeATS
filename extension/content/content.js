/**
 * ResumeATS-X — Content Script (ISOLATED world)
 *
 * Has access to chrome.runtime but NOT to page JS globals.
 * Communicates with page-bridge.js via window.postMessage and
 * with the background service worker via chrome.runtime messaging.
 */
(() => {
  'use strict';

  /** Timeout for waiting on page-bridge response (ms) */
  const BRIDGE_TIMEOUT = 8_000;

  /* ------------------------------------------------------------------ */
  /*  Extract project ID from the current Overleaf URL                  */
  /* ------------------------------------------------------------------ */
  const getProjectId = () => {
    const match = window.location.pathname.match(/\/project\/([a-f0-9]+)/);
    return match ? match[1] : null;
  };

  /* ------------------------------------------------------------------ */
  /*  Request LaTeX text from page-bridge and return via Promise         */
  /* ------------------------------------------------------------------ */
  const requestLatexText = () =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new Error('Timed out waiting for page-bridge response'));
      }, BRIDGE_TIMEOUT);

      const handler = (event) => {
        if (event.source !== window) return;
        if (event.data?.type !== 'RATSX_LATEX_TEXT') return;

        clearTimeout(timer);
        window.removeEventListener('message', handler);

        if (event.data.ok) {
          resolve(event.data.text);
        } else {
          reject(new Error(event.data.error || 'Unknown extraction error'));
        }
      };

      window.addEventListener('message', handler);

      // Ask page-bridge to extract the text
      window.postMessage({ type: 'RATSX_REQUEST_TEXT' }, '*');
    });

  /* ------------------------------------------------------------------ */
  /*  Chrome runtime message handler                                    */
  /* ------------------------------------------------------------------ */
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action !== 'GET_LATEX_TEXT') return false;

    const projectId = getProjectId();
    if (!projectId) {
      sendResponse({ ok: false, error: 'Could not extract project ID from URL' });
      return false;
    }

    requestLatexText()
      .then((latexText) => {
        sendResponse({ ok: true, latexText, projectId });
      })
      .catch((err) => {
        sendResponse({ ok: false, error: err.message, projectId });
      });

    // CRITICAL: return true to keep the message channel open for async response
    return true;
  });

  console.log('[ResumeATS-X content] Loaded in ISOLATED world');
})();
