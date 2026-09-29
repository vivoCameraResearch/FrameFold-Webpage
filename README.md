# FrameFold

**Response-Guided KV Cache Consolidation for Autoregressive Long Video Generation**

Muyu Liu · Mingming Liu · Hong Gu · Yuyao Zhang · Qin Lu

ShanghaiTech · vivo BlueImage Lab, vivo Mobile Communication Co., Ltd., China

[**Project Page**](https://vivoCameraResearch.github.io/FrameFold-Webpage/)

## Overview

FrameFold is a training-free KV cache consolidation method for autoregressive long video generation. It merges temporally redundant cache entries while preserving complete spatial grids, using conditional attention responses to guide representative construction and merge selection under a fixed cache budget.

This repository contains the project website, including video showcases, visual comparisons, the method overview, and quantitative results. The research implementation will be released separately; paper and code links will be added when available.

## Local preview

From the repository root, run:

```bash
python3 serve.py
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/). The preview server supports byte-range requests for video seeking.

The website uses plain HTML, CSS, and JavaScript. No dependency installation or build step is required.

## Website maintenance

| File | Purpose |
| --- | --- |
| `index.html` | Redirects the project homepage to `dist/` |
| `dist/index.html` | Page title, authors, abstract, and paper/code links |
| `dist/content.js` | Video paths, prompts, comparison cases, and result tables |
| `dist/app.js` | Page sections and interactions |
| `dist/player.js` | Video playback and synchronization |
| `dist/styles.css` | Layout and styling |
| `dist/assets/` | Images and video assets |

Keep media paths relative to `dist/`, for example `assets/videos/example.mp4`. To update a video, edit its `src` in `dist/content.js` and keep the configured duration consistent with the media file.

GitHub Pages publishes from the configured branch's root directory. The root `index.html` forwards visitors to `dist/`; keep both the root entry point and the `dist/` directory in the publishing branch.

To run the automated checks with Node.js 20 or later:

```bash
npm test
```

## Demo media attribution

The website currently includes fallback footage from [LongLive-RAG](https://longlive-rag.github.io/) for cases without configured videos. This footage is for preview purposes and does not represent FrameFold results.

The source [demo video](https://longlive-rag.github.io/assets/demo/native_ours_1.mp4) is stored at `dist/assets/preview/longlive-rag-demo.mp4`. Fallback behavior is configured in `dist/placeholders.js`; replace missing videos with the corresponding experimental results or set `PLACEHOLDER_VIDEO.enabled` to `false` to disable it.
