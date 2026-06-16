# GIS 高级排版系统 (GIS Advanced Layout System) 设计与技术文档

## 1. 项目概述 (Project Overview)
基于 React 开发的 GIS 地图排版与全画幅内容导出系统。该系统允许用户添加、编辑地图基础瓦片底图、导入 KML 文件呈现矢量数据，同时提供手工图形与标注在地图上的标绘功能。系统最核心的特性是集成了 **画布排版引擎**，支持用户在地图画面之上不受限地放置大标题、附注文字、指北针、比例尺等各类出图要素，并支持拖拽位置、大小缩放和旋转等，最终可以高清导出整屏图像(如 PNG 格式)。

## 2. 总体架构设计 (Architecture)
系统采用 React 作为核心视图及状态管理容器，采用 **地图引擎层 + 浮动排版层** 相叠加的架构设计：
- **底层 (地图层)**: 由 React-Leaflet 接管，负责渲染瓦片图、地图事件响应及空间数据（如 Geoman 标绘和 KML 解析）渲染。
- **顶层 (排版层)**: 由一组挂载于地图父容器的固定绝对定位组件构成，不随地图平移缩放，主要用来进行版面的二次编辑和视觉整理。

## 3. 技术栈解析 (Tech Stack)
- **核心框架**: `React 19` + `TypeScript` + `Vite` 构建，保证现代流畅的前端开发及运行体验。
- **样式与UI**: `Tailwind CSS v4` 做原子化样式控制，`Lucide React` 用作界面矢量图标体系。
- **地图内核**: `Leaflet` + `react-leaflet`，提供地图互动能力。
- **地图标绘与编辑**: `@geoman-io/leaflet-geoman-free`，极轻量强大的地图交互绘制、数据捕捉库。
- **地理空间数据转换**: `@tmcw/togeojson` 用于无缝将基于 XML 语法的 KML 拖放文件解析成 Leaflet 容易消费的 GeoJSON。
- **前端排版交互**: `react-rnd` 组件提供完美的拖拽（Drag）和缩放（Resize）功能。
- **截图渲染与导出**: `dom-to-image` （结合 `html2canvas` / `html-to-image` 等后备方案测试），将排版 DOM 节点转化为 Canvas 画布，并保存为图片。

## 4. 核心数据模块及运行机制 (Core Mechanisms)

### 4.1 统一图层状态管理 (Unified Layer State)
系统状态由一组统一描述对象的列表 `LayerConfig[]` 控制，这些配置直接对应在应用右侧的“图层和样式面板”和渲染层中：
1. **底图层 (`tile`)**: 存储地图切片服务 URL，多图层依靠数组索引确定 `zIndex`，可动态切换、合并卫星图和路网。
2. **矢量绘制 (`vector`, `kml`)**: 通过配置项缓存点、线、面及多边形的内部结构，地图内元素的变更会回调至统一的 `useState(layers)` 以双向绑定。
3. **排版图形 (`title`, `text`, `compass`, `scale`)**: 用于记录拖拽坐标 (`x`, `y`) 及其高度、宽度 `layoutConfig`，同时保留文本颜色 `color`、背景色、边框、与旋转角度 `rotation` 等 `titleConfig` 等样式信息。
4. **绑定地图组件 (`mapText`)**: 能够在坐标系统上随底图移动绑定的纯净文本标记组件。结合了 `L.divIcon` 定制生成。

本地状态通过 `localStorage` 自动持久化存储，重新载入应用会恢复上次编辑。

### 4.2 DOM 转图像导出 (DOM-to-Image Exporting)
导出部分是一个集大成且包含容错降级的环节：
1. 采用 `dom-to-image` 截取挂载地图及排版容器共同关联的包裹级 `layoutRef`。
2. 将底图瓦片层加载的 `TileLayer` 开启 `crossOrigin: "anonymous"` 避免画布因为绘制了不允许跨域读取像素的第三方图片而遭到环境污染 (Tainted canvas)。
3. 在截图前会忽略无关组件（如侧边栏、控制按钮）或者短暂 `setTimeout` 隐藏排版器边框线，并以 2 倍缩放 (`scale=2` / `pixelRatio=2`) 提升图片精度。

## 5. 技术挑战与细节解决方案 (Challenges & Solutions)

### 5.1 CSSRules 同源策略 (CORS) 阻隔
在部分预览环境插入了跨域样式表（Stylesheet）的情况下，截图库读取 CSS 渲染规则会触发 `SecurityError: The operation is insecure` 会导致导出工具静默崩溃。
> **修复方案**：暂时 Monkey Patch 挟持了浏览器的 `CSSStyleSheet.prototype.cssRules` 获取器 (getter)。在捕获因为跨域禁止访问引发的错误时，静默返回一个空数组，保障主线渲染依然进行，导出成功后恢复 getter 原本定义。

### 5.2 复杂的组件拖放与内置输入焦点冲突
作为排版系统，大标题的文本可以随着鼠标随处拖拽。拖拽库 `react-rnd` 为了截获所有的鼠标事件防止冒泡会导致其中可编辑文本 (`contentEditable`) 的区域无法正常利用鼠标获取输入焦点或框选。
> **修复方案**：状态化双击事件 `onDoubleClick` 触发一个编辑模式 `editingTextId` 并移除拖拽的 cursor 样式，利用 `contentEditable` 仅在此状态下为真打开编辑功能；在失去光标 `onBlur` 时候将文本保存到图层结构的同时自动还原回拖拽模式容器中。

### 5.3 响应式地图动态比例尺
用户要求比例尺随缩放重排，而传统的缩放比例尺只是左下角的一行字。\
> **修复方案**：侦听 `useMap` 的 `zoom`/`move` 事件动态运算将 Leaflet 原生返回的的物理映射关系通过数学计算得到每 100 米、1000 米对应屏幕当前的 `widthInPx` 并回调到 `mapScale` 状态变量中。在 `react-rnd` 中实现具有 1/3, 2/3 分段样式的高级独立出图比例尺组件。

整体实现了具有强灵活性、纯前端实现不依靠后端存储、具备地理信息标准操作与广告级别排版特性的业务需求。
