/**
 * ResumeATS-X — Popup Logic
 *
 * Manages the three view states (empty → loading → results),
 * communicates with the background service worker, and renders
 * all score visualizations.
 */
(() => {
  'use strict';

  /* ================================================================= */
  /*  DOM References                                                    */
  /* ================================================================= */
  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const views = {
    empty:   $('#empty-state'),
    loading: $('#loading-state'),
    results: $('#results-state'),
    error:   $('#error-state'),
  };

  const els = {
    jdForm:        $('#jd-form'),
    jobTitle:      $('#job-title'),
    jobDescription:$('#job-description'),
    btnSaveScore:  $('#btn-save-score'),
    btnRescore:    $('#btn-rescore'),
    btnEditJd:     $('#btn-edit-jd'),
    btnTryAgain:   $('#btn-try-again'),
    scoreRing:     $('#score-ring'),
    scoreValue:    $('#score-value'),
    subScores:     $('#sub-scores'),
    issuesList:    $('#issues-list'),
    issuesSection: $('#issues-section'),
    keywordsList:  $('#keywords-list'),
    keywordsSection: $('#keywords-section'),
    errorMessage:  $('#error-message'),
  };

  /* ================================================================= */
  /*  State                                                             */
  /* ================================================================= */
  let currentTabId   = null;
  let currentProjectId = null;
  let currentJobTitle  = '';
  let currentJobDesc   = '';
  let lastAction       = null; // for "Try Again"

  /* ================================================================= */
  /*  View Management                                                   */
  /* ================================================================= */
  const showView = (viewId) => {
    Object.values(views).forEach((v) => v.classList.remove('active'));
    if (views[viewId]) views[viewId].classList.add('active');
  };

  const showError = (message) => {
    els.errorMessage.textContent = message;
    showView('error');
  };

  /* ================================================================= */
  /*  Messaging helpers                                                 */
  /* ================================================================= */
  const sendMessage = (payload) =>
    new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve(response);
      });
    });

  /* ================================================================= */
  /*  Score Ring                                                        */
  /* ================================================================= */
  const getScoreColor = (score) => {
    if (score < 40)  return 'red';
    if (score < 70)  return 'orange';
    return 'green';
  };

  const updateScoreRing = (score) => {
    const color = getScoreColor(score);
    const pct = Math.max(0, Math.min(100, score));
    const cssColor = `var(--score-${color})`;

    els.scoreRing.style.background = `conic-gradient(${cssColor} ${pct * 3.6}deg, var(--bg-tertiary) 0deg)`;
    els.scoreRing.className = `score-ring ring-${color}`;
    els.scoreValue.className = `score-value score-color-${color}`;
  };

  const animateScore = (target) => {
    const duration = 1000; // ms
    const start = performance.now();
    const from  = 0;

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (target - from) * eased);

      els.scoreValue.textContent = current;
      updateScoreRing(current);

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  };

  /* ================================================================= */
  /*  Sub-Scores                                                        */
  /* ================================================================= */
  const SUB_SCORE_META = [
    { key: 'keywordMatch',    label: 'Keyword Match',    weight: '40%' },
    { key: 'quantification',  label: 'Quantification',   weight: '25%' },
    { key: 'sectionCoverage', label: 'Section Coverage',  weight: '20%' },
    { key: 'parseability',    label: 'Parseability',     weight: '15%' },
  ];

  const renderSubScores = (scores) => {
    els.subScores.innerHTML = '';

    SUB_SCORE_META.forEach(({ key, label, weight }) => {
      const value = scores?.[key] ?? 0;
      const color = getScoreColor(value);

      const row = document.createElement('div');
      row.className = 'sub-score-row';
      row.innerHTML = `
        <div class="sub-score-header">
          <span class="sub-score-name">${label}</span>
          <span class="sub-score-weight">${weight}</span>
        </div>
        <div class="sub-score-meta">
          <div class="sub-score-track">
            <div class="sub-score-fill fill-${color}" style="width:0%"></div>
          </div>
          <span class="sub-score-number score-color-${color}">${value}</span>
        </div>
      `;

      els.subScores.appendChild(row);

      // Animate fill bar after a frame
      requestAnimationFrame(() => {
        const fill = row.querySelector('.sub-score-fill');
        if (fill) fill.style.width = `${value}%`;
      });
    });
  };

  /* ================================================================= */
  /*  Issues                                                            */
  /* ================================================================= */
  const renderIssues = (issues) => {
    els.issuesList.innerHTML = '';

    if (!issues || issues.length === 0) {
      els.issuesSection.style.display = 'none';
      return;
    }

    els.issuesSection.style.display = 'block';

    // Show top 5
    issues.slice(0, 5).forEach((issue) => {
      const severity = issue.severity || 'medium';
      const card = document.createElement('div');
      card.className = 'issue-card';
      card.innerHTML = `
        <div class="severity-dot ${severity}"></div>
        <div class="issue-body">
          <div class="issue-message">${escapeHtml(issue.message || '')}</div>
          ${issue.context ? `<div class="issue-context">${escapeHtml(issue.context)}</div>` : ''}
          ${issue.suggestion ? `<div class="issue-suggestion">${escapeHtml(issue.suggestion)}</div>` : ''}
        </div>
      `;
      els.issuesList.appendChild(card);
    });
  };

  /* ================================================================= */
  /*  Missing Keywords                                                  */
  /* ================================================================= */
  const renderMissingKeywords = (keywords) => {
    els.keywordsList.innerHTML = '';

    if (!keywords || keywords.length === 0) {
      els.keywordsSection.style.display = 'none';
      return;
    }

    els.keywordsSection.style.display = 'block';

    keywords.forEach((kw, i) => {
      const pill = document.createElement('span');
      pill.className = 'keyword-pill';
      pill.textContent = kw.term || kw;
      pill.style.animationDelay = `${i * 0.03}s`;
      els.keywordsList.appendChild(pill);
    });
  };

  /* ================================================================= */
  /*  Scoring Flow                                                      */
  /* ================================================================= */
  const startScoringFlow = async () => {
    lastAction = startScoringFlow;
    showView('loading');

    try {
      // 1. Get LaTeX text from the active tab
      const textResult = await sendMessage({
        action: 'GET_LATEX_TEXT',
        tabId: currentTabId,
      });

      if (!textResult?.ok) {
        throw new Error(textResult?.error || 'Failed to extract LaTeX text from Overleaf');
      }

      // 2. Score the resume
      const scoreResult = await sendMessage({
        action: 'SCORE_RESUME',
        projectId: currentProjectId,
        latexText: textResult.latexText,
      });

      if (!scoreResult?.ok) {
        throw new Error(scoreResult?.error || 'Scoring failed');
      }

      // 3. Render results
      renderResults(scoreResult.data);
    } catch (err) {
      showError(err.message);
    }
  };

  const renderResults = (data) => {
    showView('results');

    // Composite score
    const compositeScore = data.compositeScore ?? data.score ?? 0;
    animateScore(compositeScore);

    // Sub-scores
    renderSubScores(data.subScores ?? {});

    // Issues
    renderIssues(data.issues ?? []);

    // Missing keywords
    renderMissingKeywords(data.missingKeywords ?? []);
  };

  /* ================================================================= */
  /*  Event Handlers                                                    */
  /* ================================================================= */

  // Save & Score
  els.jdForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const jobTitle = els.jobTitle.value.trim();
    const jobDescription = els.jobDescription.value.trim();

    if (!jobTitle || !jobDescription) return;

    currentJobTitle = jobTitle;
    currentJobDesc  = jobDescription;

    lastAction = async () => {
      showView('loading');
      try {
        // Cache locally so it survives in-memory server restarts
        await new Promise((resolve) => {
          chrome.storage.local.set({
            [`jd_${currentProjectId}`]: { jobTitle, jobDescription }
          }, resolve);
        });

        await sendMessage({
          action: 'SAVE_JOB_DESC',
          projectId: currentProjectId,
          jobTitle,
          jobDescription,
        });
        await startScoringFlow();
      } catch (err) {
        showError(err.message);
      }
    };

    await lastAction();
  });

  // Rescore
  els.btnRescore.addEventListener('click', () => {
    startScoringFlow();
  });

  // Edit Job Description
  els.btnEditJd.addEventListener('click', () => {
    els.jobTitle.value      = currentJobTitle;
    els.jobDescription.value = currentJobDesc;
    showView('empty');
  });

  // Try Again
  els.btnTryAgain.addEventListener('click', () => {
    if (typeof lastAction === 'function') {
      lastAction();
    } else {
      showView('empty');
    }
  });

  /* ================================================================= */
  /*  Utilities                                                         */
  /* ================================================================= */
  const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  /* ================================================================= */
  /*  Initialization                                                    */
  /* ================================================================= */
  const init = async () => {
    try {
      // 1. Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        showError('No active tab found.');
        return;
      }

      // 2. Check if on Overleaf
      const url = tab.url || '';
      const overleafMatch = url.match(/overleaf\.com\/project\/([a-f0-9]+)/);

      if (!overleafMatch) {
        showError('Open an Overleaf project first to use ResumeATS-X.');
        return;
      }

      currentTabId    = tab.id;
      currentProjectId = overleafMatch[1];

      // 3. Always show the empty form so the user can paste the context
      showView('empty');
    } catch (err) {
      showError(err.message);
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
