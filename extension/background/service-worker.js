/**
 * ResumeATS-X — Background Service Worker (Manifest V3)
 *
 * Ephemeral by design — all listeners are registered synchronously at
 * the top level. Persistent state lives in chrome.storage.local.
 */

const API_BASE = 'http://localhost:5000/api';

/* -------------------------------------------------------------------- */
/*  Device ID management                                                */
/* -------------------------------------------------------------------- */

/** Ensure a unique device ID exists in storage (created once on install). */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    const deviceId = crypto.randomUUID();
    chrome.storage.local.set({ deviceId });
    console.log('[ResumeATS-X SW] Installed — device ID generated');
  }
});

/** Retrieve the device ID from storage. */
const getDeviceId = () =>
  new Promise((resolve) => {
    chrome.storage.local.get('deviceId', (result) => {
      if (result.deviceId) {
        resolve(result.deviceId);
      } else {
        // Safety net: generate one if somehow missing
        const id = crypto.randomUUID();
        chrome.storage.local.set({ deviceId: id });
        resolve(id);
      }
    });
  });

/* -------------------------------------------------------------------- */
/*  Helper — call backend API                                           */
/* -------------------------------------------------------------------- */
const apiFetch = async (path, options = {}) => {
  const deviceId = await getDeviceId();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': deviceId,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }

  return res.json();
};

/* -------------------------------------------------------------------- */
/*  Helper — get LaTeX text from the active tab's content script        */
/* -------------------------------------------------------------------- */
const getLatexTextFromTab = (tabId) =>
  new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { action: 'GET_LATEX_TEXT' }, (response) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      if (!response) {
        return reject(new Error('No response from content script'));
      }
      if (!response.ok) {
        return reject(new Error(response.error || 'Content script error'));
      }
      resolve(response);
    });
  });

/* -------------------------------------------------------------------- */
/*  Message router                                                      */
/* -------------------------------------------------------------------- */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action } = message;

  /* ---- GET_LATEX_TEXT ---- */
  if (action === 'GET_LATEX_TEXT') {
    const tabId = message.tabId ?? sender.tab?.id;
    if (!tabId) {
      sendResponse({ ok: false, error: 'No tab ID available' });
      return false;
    }

    getLatexTextFromTab(tabId)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ ok: false, error: err.message }));

    return true; // async
  }

  /* ---- SCORE_RESUME ---- */
  if (action === 'SCORE_RESUME') {
    const { projectId, latexText } = message;

    apiFetch('/score', {
      method: 'POST',
      body: JSON.stringify({ projectId, latexText }),
    })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));

    return true; // async
  }

  /* ---- SAVE_JOB_DESC ---- */
  if (action === 'SAVE_JOB_DESC') {
    const { projectId, jobTitle, jobDescription } = message;

    apiFetch('/job-description', {
      method: 'POST',
      body: JSON.stringify({ projectId, jobTitle, jobDescription }),
    })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));

    return true; // async
  }

  /* ---- GET_JOB_DESC ---- */
  if (action === 'GET_JOB_DESC') {
    const { projectId } = message;

    apiFetch(`/job-description/${projectId}`)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));

    return true; // async
  }

  /* ---- SCORE_AND_SAVE (convenience: fetch latex + score in one shot) ---- */
  if (action === 'SCORE_AND_SAVE') {
    const { tabId, projectId } = message;

    (async () => {
      try {
        // 1. Get LaTeX from content script
        const { latexText } = await getLatexTextFromTab(tabId);

        // 2. Send to backend for scoring
        const data = await apiFetch('/score', {
          method: 'POST',
          body: JSON.stringify({ projectId, latexText }),
        });

        sendResponse({ ok: true, data, latexText });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    })();

    return true; // async
  }

  // Unknown action — do nothing
  return false;
});

console.log('[ResumeATS-X SW] Service worker registered');
