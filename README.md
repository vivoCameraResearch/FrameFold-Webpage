# FrameFold project website

英文静态论文项目页，无框架、无外部依赖。当前交付仅为本地预览，未发布。

## 预览

在 `website` 目录运行 `python3 serve.py`，打开 http://127.0.0.1:8765/。
预览服务仅监听本机，并支持长视频拖动所需的 byte-range 请求。

检查：`npm test`（Node 20+）；无需 `npm install` 或构建。

### 当前占位素材

主页面直接使用同一个视频填充尚未配置素材的案例，无单独预览入口或 URL 参数。采用直接展开的视觉对比布局；Prompt 和参数暂不显示，原始数据保留在配置中。

- 来源：[LongLive-RAG](https://longlive-rag.github.io/)，[原始视频](https://longlive-rag.github.io/assets/demo/native_ours_1.mp4)。下载于 2026-09-29。
- 本地路径：`dist/assets/preview/longlive-rag-demo.mp4`；3,816,416 字节；实际时长 29.625 秒。
- `dist/placeholders.js` 统一配置临时素材。播放时长采用样片实际长度，长时展示暂用 0/10/20/25 秒章节；论文原始时长和章节保留在 `content.js`。
- 仅对整组视频都未填写的案例应用占位；开始填入某组真实视频后，该组自动使用正式配置，不与不同时长的占位混播。
- 后续填入所有真实素材，或把 `PLACEHOLDER_VIDEO.enabled` 设为 `false`，即可关闭占位。无需调整布局或播放器。
- 占位素材随仓库提交，便于拉取后直接测试；来源记录在本文档。当前所有画面仅供内部测试，发布前替换成自己的视频。
- 当前只保留播放/暂停与 1/2/4/8 倍速，长时展示另有共享进度条。

## 内容与素材

- `dist/index.html`：标题、作者、单位与论文链接。通讯作者 Qin Lu；未知邮箱和作者主页不生成虚假链接。
- `dist/content.js`：所有案例、Prompt、视频地址、实验条件和表格数值。
- `dist/app.js`：三个展示区、方法示意和数据展示。
- `dist/player.js`：独立视频的组播放控制。
- `dist/styles.css`：桌面和移动端布局。
- `dist/assets/framefold-paper.pdf`：用户提供的论文副本；原始 PDF 未修改。

案例来自论文 Figure 4 / 9 / 10 / 13。原始视频地址仍为 `null`，当前由统一占位配置提供测试画面。
`prompt: null` 表示只有论文中的节选；页面明确显示 Prompt excerpt。将真实完整输入填入 `prompt` 后自动显示 Generation prompt。
论文中看似完整的两段 Prompt 也应在上线前与实际生成配置复核。种子尚未提供，不显示。

添加素材：在案例的 `media` 中为每个方法填写 `src` 和可选的 `poster`：

```js
{ method: 'framefold', src: 'assets/videos/portrait/framefold.mp4', poster: 'assets/posters/portrait.jpg' }
```

也支持 HTTPS 视频地址。实际托管端应支持 Range 请求及 `video/mp4` 类型。视频不需要跨域 Canvas 操作，因此不强制匿名 CORS。
建议 MP4/H.264、yuv420p、fast-start，同组统一帧率、分辨率、时长和开始时间。保留原始结果，网页转码只控制体积，不做美化。
本地 `duration` 必须与视频实际长度相差不超过 0.5 秒，否则报告错误，不静默裁切。
`startTime` 是片段在原始生成中的起始秒数；所有 UI 时间戳显示原始生成时间。
`chapters` 是相对于视频开头的跳转秒数，必须小于实际时长。

## 已确认的交互

- 精选展示：FrameFold 视频全部展开，桌面一行两个。
- 基线对比：按 Self Forcing、Causal Forcing、LongLive 分组，每个骨干仅展示配置中的第一个案例，一行 Deep Forcing / FadeMem / FrameFold 三列。其余案例数据保留，不显示选择器。
- 长时展示：FadeMem / FrameFold 两列，保留一条共享进度条。
- Prompt、参数、章节按钮、重播、常驻播放状态文字暂不显示；Prompt 等数据仍保留于 `content.js`。
- 每个骨干小节共用播放/暂停和 1× / 2× / 4× / 8×。精选、长时展示各有一组相同控件。
- 每行视频进入视野后静音自动播放，离开视野暂停，同一行同步循环。不同案例独立计时，倍率与手动暂停状态由小节共享。
- 读者手动暂停后，滚动不会重新启动该小节；浏览器标签页进入后台暂停，返回后按可见范围和读者选择恢复。
- 系统偏好减少动态效果时不自动播放，读者可主动点击播放。
- 手机 600px 以下按案例纵向排列所有方法，无方法切换按钮；每个视频上方保留方法名。
- 临近视野时读取首帧；一行内任一视频缓冲则暂停整行，准备好后恢复。漂移超过 120ms 时修正，属于近似同步。
- 全屏按钮仅在鼠标悬停、键盘聚焦或触屏设备上显示。加载错误时显示一行重试说明，通过 Play 重试。
- 标题下保留 Paper / Code 两个链接位置，分别用于未来的 arXiv / GitHub 地址。当前不设置 href，并标注 aria-disabled。BibTeX 待正式引用信息确定后添加。

## 验证与待完成项

`tests/player.test.js` 使用媒体对象替身验证同步状态、缓冲、跨组暂停、移动端切换和异步取消。
`validate.mjs` 检查配置、时间节点、指标范围与本地资源路径。
浏览器检查覆盖当前占位版本的桌面/手机布局、案例与骨干切换、倍速选择和结果表切换。

真正的视频解码、8× 流畅性、网络缓冲、跨浏览器全屏与实际漂移，必须等原始视频接入后再验收。不能把状态测试当作真实媒体性能测试。

公开前：补视频与封面、完整 Prompt、复核种子和对比条件、添加代码链接/引用、替换匿名 PDF（如需），并确认作者信息与公开时间。
仅上传 `dist/` 到静态托管；目前没有部署配置、账户操作或公开 URL。

## Logo

根目录 `logo.png` 为用户提供的原图，保持不变。`dist/assets/logo.png` 保存原样副本。
`framefold-logo.svg` 内嵌原始 PNG，以 viewBox 去除外围透明留白，用于首屏及导航；并非重新绘制的矢量字标。
`favicon.svg` 用裁剪路径单独显示原图中的折叠 F 图形，不含右侧字标。首屏宽 520px，手机宽 320px，导航宽 140px，均保持比例。
更换原始 Logo 后需同步重新生成两个 SVG 显示版本。

## Method pipeline

Method 小节使用根目录 `pipeline-v3.pdf` 提供的论文流程图，替换早期 HTML 简化示意图。
网页图片 `dist/assets/framefold-pipeline.png` 为 2600 × 919 像素的完整渲染；保留原始比例。
点击图片或图下注释可打开 `dist/assets/framefold-pipeline.pdf` 原始 PDF 查看公式细节。
更新源 PDF 时，需要同时更新网页 PNG 和 PDF 副本。
