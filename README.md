# GIS 高级排版系统

一个纯前端 GIS 标绘与出图排版工具，基于 React、Leaflet、Geoman 和 Vite 构建。它适合快速叠加底图、导入边界/矢量数据、添加标题/指北针/比例尺，并导出当前排版画面。

## 功能

- 图源管理：内置 ArcGIS、天地图、星图云等瓦片图源配置。
- 数据导入：支持 KML、GeoJSON、Shapefile zip。
- 地图标绘：支持点、线、矩形、多边形、地图文字等 Geoman 标绘。
- 排版元素：支持标题、布局文字、指北针、比例尺拖拽与样式调整。
- 工程文件：支持保存和打开 `.maplayout.json`，恢复图层、导入数据和画布尺寸。
- 画布尺寸：支持预设尺寸和自定义宽高。
- 图片导出：支持导出当前画布为 PNG。

## 本地运行

```bash
npm install
npm run dev
```

默认开发服务运行在 `http://localhost:3000`。

## 常用命令

```bash
npm test
npm run lint
npm run build
```

## 数据导入说明

- KML：适合导入规划边界、线路等常见 Google Earth/KML 数据。
- GeoJSON：支持 `.geojson` 和 `.json`，会自动归一为 `FeatureCollection`。
- Shapefile zip：上传包含 `.shp` 的 zip 文件，若 zip 内有多个 Shapefile，会拆成多个图层。导入前可选择 DBF 编码和坐标系。

Shapefile 编码默认优先读取 `.cpg`，没有 `.cpg` 时按 GB18030 解析中文字段。坐标系默认自动识别：经纬度数据按 WGS84/CGCS2000 经纬度处理，带号前缀的 CGCS2000 高斯投影坐标会自动转为经纬度。若自动识别不符合数据实际情况，可以在导入前手动选择 WGS84 或 CGCS2000。

## 工程文件

顶部工具栏提供：

- 保存工程：导出 `.maplayout.json`。
- 打开工程：恢复已保存的图层、导入数据、排版元素和画布尺寸。
- 重置：清空当前工程并恢复默认图层。
