# ResumeATS-X

Live ATS match scoring for resumes being written in Overleaf, directly from the browser toolbar — no PDF downloads, no separate websites.

## Project Structure

This repository contains two main components:

1. **Chrome Extension (`/extension`)**: The client-side application that interfaces with Overleaf's CodeMirror editor.
2. **Backend Server (`/server`)**: An Express.js backend that handles LaTeX stripping and ATS scoring heuristics using NLP (Natural Language Processing).

## Features

- **Real-Time Extraction**: Safely extracts the full LaTeX document from Overleaf without disrupting the user's workflow.
- **ATS Parsing Emulation**: Strips LaTeX commands to simulate how a real ATS system would interpret the raw text.
- **Job Description Matching**: Evaluates keywords, section coverage, and proper quantification (using action verbs and metrics) against a provided job description.
- **Local Privacy**: User identifiers are anonymous (`deviceId`), and the backend uses an in-memory or local MongoDB database to store state temporarily.

## Setup

### 1. Start the Backend Server
```bash
cd server
npm install
npm start
```
The server will start on `http://localhost:5000`. By default, if `MONGODB_URI` fails (or isn't available), it falls back to using an in-memory `mongodb-memory-server` for seamless development.

### 2. Load the Chrome Extension
1. Open Google Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked** and select the `extension` folder from this repository.
4. Navigate to an Overleaf project (`https://www.overleaf.com/project/*`).
5. Click the ResumeATS-X extension icon in your toolbar to see the popup.

## How it Works

The extension uses two content scripts:
- `page-bridge.js` (MAIN world): Directly accesses the CodeMirror 6 internal state to retrieve the full document.
- `content.js` (ISOLATED world): Interfaces with the Chrome Extension API to securely relay messages.

The backend server scores the resume on four parameters:
- **Keyword Match**: Extracted from the Job Description using NLP stemming.
- **Quantification**: Evaluates bullet points for metrics and strong action verbs.
- **Section Coverage**: Checks for standard ATS sections (Experience, Education, etc.).
- **Parseability**: Penalizes problematic LaTeX structures like multi-column layouts or nested tables.
