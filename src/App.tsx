import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GeomanMap } from './components/GeomanMap';
import { CompassArrow } from './components/CompassArrow';
import { TileSourceManager } from './components/TileSourceManager';
import { getTileSourceFromCatalog } from './lib/tileSources';
import { Download, Upload, Settings, Layers, Monitor, RotateCcw, Trash2, Edit3, Eye, EyeOff, Type, Compass, Box, ChevronUp, ChevronDown, Map as MapIcon, PlusSquare } from 'lucide-react';

import { Rnd } from 'react-rnd';

const PAGE_SIZES = [
  { id: '1080p', label: '网页 (1920x1080)', w: 1920, h: 1080 },
  { id: 'A4-H', label: 'A4 横向 (1123x794)', w: 1123, h: 794 },
  { id: 'A3-H', label: 'A3 横向 (1587x1123)', w: 1587, h: 1123 },
  { id: 'Custom', label: '默认预览 (1100x750)', w: 1100, h: 750 }
];

export interface LayerConfig {
  id: string;
  name: string;
  visible: boolean;
  type: 'tile' | 'kml' | 'title' | 'compass' | 'vector' | 'scale' | 'text';
  
  // tile properties
  url?: string;
  sourceId?: string;
  sourceParams?: Record<string, string>;
  zoomOffset?: number;
  tileSize?: number;
  maxNativeZoom?: number;
  minZoom?: number;
  attribution?: string;

  // kml properties
  kmlData?: string;
  color?: string; // fallback color for kml
  isClosedKml?: boolean;
  
  // vector properties (from Geoman)
  shape?: string;
  vectorStyle?: {
    color: string;
    fillColor: string;
    weight: number;
    fillOpacity: number;
  };
  textStyle?: {
    color: string;
    fontSize: number;
    backgroundColor: string;
    fontFamily: string;
    fontWeight: string;
    multiline: boolean;
    text?: string;
    boxWidth?: number;
    boxHeight?: number;
    rotation?: number;
    textAlign?: 'left' | 'center' | 'right';
    padding?: number;
  };
  
  // title properties
  titleConfig?: {
    text: string;
    fontSize: number;
    color: string;
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    padding: number;
    rotation?: number;
  };

  // compass properties
  compassConfig?: {
    scale?: number;
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    padding: number;
  };

  // scale properties
  scaleConfig?: {
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    padding: number;
    color: string;
  };

  // layout properties (react-rnd)
  layoutConfig?: {
    x: number;
    y: number;
    width?: number | string;
    height?: number | string;
  };
}

export function parseColor(colorStr: string): { hex: string, alpha: number } {
  if (!colorStr) return { hex: '#ffffff', alpha: 1 };
  if (colorStr === 'transparent') return { hex: '#ffffff', alpha: 0 };
  if (colorStr.startsWith('rgba')) {
    const parts = colorStr.replace('rgba(', '').replace(')', '').split(',');
    if (parts.length === 4) {
      const r = parseInt(parts[0].trim());
      const g = parseInt(parts[1].trim());
      const b = parseInt(parts[2].trim());
      const a = parseFloat(parts[3].trim());
      const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
      return { hex, alpha: a };
    }
  }
  if (colorStr.startsWith('#')) {
    if (colorStr.length === 9) {
      const hex = colorStr.slice(0, 7);
      const a = parseInt(colorStr.slice(7, 9), 16) / 255;
      return { hex, alpha: a };
    }
    return { hex: colorStr, alpha: 1 };
  }
  return { hex: '#ffffff', alpha: 1 };
}

export function toRgba(hex: string, alpha: number): string {
  if (!hex) return 'rgba(255, 255, 255, 1)';
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const getInitialLayers = (): LayerConfig[] => {
  const saved = localStorage.getItem('geoman_map_layers');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved layers', e);
    }
  }
  return [
    {
      id: 'title',
      name: '大标题 (图名)',
      visible: true,
      type: 'title',
      layoutConfig: { x: 20, y: 20 },
      titleConfig: {
        text: 'XXX镇XXX村XXX路地块控制性详细规划区位图',
        fontSize: 28,
        color: '#000000',
        backgroundColor: '#ffffff',
        borderColor: '#000000',
        borderWidth: 0,
        padding: 12
      }
    },
    {
      id: 'compass',
      name: '指北针',
      visible: true,
      type: 'compass',
      layoutConfig: { x: Math.max(0, PAGE_SIZES[3].w - 120), y: 20, width: 100, height: 100 },
      compassConfig: {
        backgroundColor: 'rgba(255, 255, 255, 0)',
        borderColor: '#000000',
        borderWidth: 0,
        padding: 0
      }
    },
    {
      id: 'scale',
      name: '地图比例尺',
      visible: true,
      type: 'scale',
      layoutConfig: { x: 20, y: 650, width: 300, height: 40 },
      scaleConfig: {
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderColor: '#000000',
        borderWidth: 1.5,
        padding: 4,
        color: '#000000'
      }
    },
    {
      id: 'annotations',
      name: '地名注记 (ArcGIS)',
      visible: true,
      type: 'tile',
      sourceId: 'arcgis-boundaries'
    },
    {
      id: 'satellite',
      name: '卫星影像 (ArcGIS)',
      visible: true,
      type: 'tile',
      sourceId: 'arcgis-satellite'
    }
  ];
};

const getInitialCustomSources = (): { name: string, url: string }[] => {
  const saved = localStorage.getItem('geoman_custom_sources');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved custom sources', e);
    }
  }
  return [];
};

export default function App() {
  const [layoutSize, setLayoutSize] = useState(PAGE_SIZES[3]);
  const [isExporting, setIsExporting] = useState(false);
  const layoutRef = useRef<HTMLDivElement>(null);
  const [mapScale, setMapScale] = useState({ meters: 100, widthInPx: 100 });

  const [layers, setLayers] = useState<LayerConfig[]>(getInitialLayers);
  const [customSources, setCustomSources] = useState<{name: string, url: string}[]>(getInitialCustomSources);

  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [isSourceManagerOpen, setIsSourceManagerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('geoman_map_layers', JSON.stringify(layers));
  }, [layers]);

  useEffect(() => {
    localStorage.setItem('geoman_custom_sources', JSON.stringify(customSources));
  }, [customSources]);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { id, text } = e.detail || {};
      if (!id) return;
      setLayers(ls => ls.map(l =>
        l.id === id && l.textStyle
          ? { ...l, textStyle: { ...l.textStyle, text } }
          : l
      ));
    };
    window.addEventListener('vector-text-edit', handler as EventListener);
    return () => window.removeEventListener('vector-text-edit', handler as EventListener);
  }, []);

  const [activeItemId, setActiveItemId] = useState<string | null>('satellite');

  const addComponent = (type: 'title' | 'compass' | 'scale' | 'text') => {
    if (layers.find(l => l.type === type) && type !== 'text') return;

    const id = type === 'text' ? `${type}-${Date.now()}` : type;
    
    const newLayer: LayerConfig = {
      id,
      name: type === 'title' ? '大标题 (图名)' : type === 'compass' ? '指北针' : type === 'scale' ? '地图比例尺' : '排版布局文字',
      visible: true,
      type: type as any,
      layoutConfig: { x: 50, y: 50 },
    };

    if (type === 'title') {
      newLayer.titleConfig = {
        text: '新大标题',
        fontSize: 28,
        color: '#000000',
        backgroundColor: '#ffffff',
        borderColor: '#000000',
        borderWidth: 0,
        padding: 12
      };
    } else if (type === 'text') {
      newLayer.layoutConfig = { x: 100, y: 100, width: 200, height: 60 };
      newLayer.titleConfig = {
        text: '输入文字...',
        fontSize: 16,
        color: '#000000',
        backgroundColor: '#ffffff',
        borderColor: '#2A2D35',
        borderWidth: 1,
        padding: 8
      };
    } else if (type === 'compass') {
      newLayer.layoutConfig = { x: 50, y: 50, width: 80, height: 80 };
      newLayer.compassConfig = {
        backgroundColor: 'rgba(255, 255, 255, 0)',
        borderColor: '#000000',
        borderWidth: 0,
        padding: 0
      };
    } else if (type === 'scale') {
      newLayer.layoutConfig = { x: 50, y: 50, width: 300, height: 40 };
      newLayer.scaleConfig = {
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderColor: '#000000',
        borderWidth: 1.5,
        padding: 4,
        color: '#000000'
      };
    }

    setLayers([newLayer, ...layers]);
    setActiveItemId(newLayer.id);
  };

  const moveLayer = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= layers.length) return;
    const newLayers = [...layers];
    const temp = newLayers[index];
    newLayers[index] = newLayers[newIndex];
    newLayers[newIndex] = temp;
    setLayers(newLayers);
  };

  const handleKmlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) return;
        const newLayer: LayerConfig = {
          id: `kml-${Date.now()}`,
          name: file.name,
          visible: true,
          type: 'kml',
          kmlData: text,
          color: '#ff0000',
          isClosedKml: false,
          vectorStyle: {
            color: '#ff0000',
            fillColor: '#ff0000',
            weight: 3,
            fillOpacity: 0.4
          }
        };
        setLayers(prev => [newLayer, ...prev]);
        setActiveItemId(newLayer.id);
      };
      reader.readAsText(file);
    }
    // reset input so it can be re-selected
    e.target.value = '';
  };

  const exportAsImage = useCallback(async () => {
    if (!layoutRef.current) return;
    setIsExporting(true);

    // Monkey-patch CSSStyleSheet.prototype.cssRules to bypass CORS errors
    const originalGetter = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'cssRules')?.get;
    if (originalGetter) {
      Object.defineProperty(CSSStyleSheet.prototype, 'cssRules', {
        get(this: CSSStyleSheet) {
          try { return originalGetter.call(this); }
          catch { return []; }
        },
        configurable: true,
      });
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!layoutRef.current) return;

      const el = layoutRef.current;
      const w = el.clientWidth;
      const h = el.clientHeight;

      // Try html-to-image first (better CORS/SVG handling)
      let dataUrl: string | null = null;
      try {
        const { toPng } = await import('html-to-image');
        dataUrl = await toPng(el, {
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          width: w,
          height: h,
          cacheBust: true,
          style: { transform: 'none' },
          filter: (node: HTMLElement) => {
            if (node.tagName === 'IFRAME') return false;
            return true;
          }
        });
      } catch (err1) {
        console.warn('html-to-image failed, trying html2canvas fallback:', err1);
        // Fallback to html2canvas
        try {
          const html2canvas = (await import('html2canvas')).default;
          const canvas = await html2canvas(el, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            allowTaint: true,
            width: w,
            height: h,
          });
          dataUrl = canvas.toDataURL('image/png');
        } catch (err2) {
          console.warn('html2canvas also failed:', err2);
        }
      }

      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `GIS_Layout_${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      } else {
        alert("导出失败，请通过截图工具保存");
      }
    } catch (err) {
      console.error("Export failed", err);
      alert("导出失败，请通过截图工具保存");
    } finally {
      setIsExporting(false);
      // Restore original cssRules getter
      if (originalGetter) {
        Object.defineProperty(CSSStyleSheet.prototype, 'cssRules', {
          get: originalGetter,
          configurable: true,
        });
      }
    }
  }, []);

  const activeLayer = layers.find(l => l.id === activeItemId);
  const activeTileSource = activeLayer?.type === 'tile' && activeLayer.sourceId
    ? getTileSourceFromCatalog(activeLayer.sourceId) ?? null
    : null;

  const deleteLayer = (id: string) => {
    setLayers(ls => ls.filter(l => l.id !== id));
    if (activeItemId === id) setActiveItemId(null);
  };

  const addTileLayer = () => {
    const newLayer: LayerConfig = {
      id: `tile-${Date.now()}`,
      name: '新瓦片图层',
      visible: true,
      type: 'tile',
    };
    setLayers(prev => [newLayer, ...prev]);
    setActiveItemId(newLayer.id);
  };

  const updateLayer = (id: string, updates: Partial<LayerConfig>) => {
    setLayers(ls => ls.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const getLayerIcon = (type: string) => {
    switch (type) {
      case 'tile': return <MapIcon size={14} className="text-[#8E9299]" />;
      case 'kml': return <Box size={14} className="text-[#3B82F6]" />;
      case 'vector': return <Edit3 size={14} className="text-green-500" />;
      case 'title': return <Type size={14} className="text-purple-500" />;
      case 'compass': return <Compass size={14} className="text-orange-500" />;
      case 'scale': return <Settings size={14} className="text-yellow-500" />;
      default: return <Layers size={14} />;
    }
  };

  return (
    <div className="h-screen w-full bg-[#0B0C0E] text-[#E2E4E9] flex flex-col font-sans overflow-hidden">
      {/* Top Navbar */}
      <header className="h-14 border-b border-[#2A2D35] bg-[#151619] flex items-center justify-between px-4 shrink-0 shadow-sm z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center shadow-lg shadow-blue-500/20">
            <MapIcon size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide">GIS 高级排版系统</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={exportAsImage}
            disabled={isExporting}
            className="flex items-center gap-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-1.5 rounded text-xs font-medium transition-all focus:ring-2 focus:ring-[#3B82F6]/50 disabled:opacity-50"
          >
            {isExporting ? <RotateCcw className="animate-spin" size={14} /> : <Download size={14} />}
            {isExporting ? '导出中...' : '导出 PNG'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Left: Layers & Tools */}
        <aside className="w-64 border-r border-[#2A2D35] bg-[#0B0C0E] flex flex-col shrink-0 z-20">
          
          <div className="p-3 border-b border-[#2A2D35]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-[#8E9299] font-bold uppercase tracking-wider">图层管理</p>
            </div>
            <div className="mb-3">
              <p className="text-[10px] text-[#3B82F6] font-bold mb-1.5">地图图层 (随地图缩放)</p>
              <p className="text-[9px] text-[#8E9299] mb-1.5">使用地图左上角工具栏绘制标绘和地图文字</p>
              <label className="flex items-center gap-2 text-xs text-[#3B82F6] cursor-pointer hover:underline">
                <Upload size={14} /> 导入 KML 边界
                <input type="file" accept=".kml" className="hidden" onChange={handleKmlUpload} />
              </label>
              <button
                onClick={() => setIsSourceManagerOpen(true)}
                className="flex items-center gap-2 text-xs text-[#3B82F6] cursor-pointer hover:underline mt-2"
              >
                <Layers size={14} /> 管理图源
              </button>
            </div>
            <div className="mb-2">
              <p className="text-[10px] text-[#8E9299] font-bold mb-1.5">排版图层 (画布级别)</p>
              <div className="flex gap-1">
                <button title="添加大标题" onClick={() => addComponent('title')} className="p-1 hover:bg-[#2A2D35] rounded"><Type size={12}/></button>
                <button title="添加指北针" onClick={() => addComponent('compass')} className="p-1 hover:bg-[#2A2D35] rounded"><Compass size={12}/></button>
                <button title="添加比例尺" onClick={() => addComponent('scale')} className="p-1 hover:bg-[#2A2D35] rounded"><PlusSquare size={12}/></button>
                <button title="添加布局文字" onClick={() => addComponent('text')} className="p-1 hover:bg-[#2A2D35] rounded"><Edit3 size={12}/></button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {layers.map((layer, index) => (
                <div 
                  key={layer.id} 
                  className={`flex items-center justify-between gap-1 p-1.5 rounded cursor-pointer border group ${activeItemId === layer.id ? 'bg-[#1F2128] border-[#3B82F6]' : 'border-transparent hover:bg-[#1F2128]'}`}
                  onClick={() => setActiveItemId(layer.id)}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <div 
                      onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
                      className="cursor-pointer shrink-0"
                    >
                      {layer.visible ? <Eye size={14} className="text-[#3B82F6] hover:text-white" /> : <EyeOff size={14} className="text-[#8E9299] hover:text-white" />}
                    </div>
                    {getLayerIcon(layer.type)}
                    <span className="text-xs truncate w-full text-white">{layer.name}</span>
                  </div>
                  
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex flex-col mr-1">
                      <button className="text-[#8E9299] hover:text-white" onClick={(e) => { e.stopPropagation(); moveLayer(index, -1); }}><ChevronUp size={12} /></button>
                      <button className="text-[#8E9299] hover:text-white" onClick={(e) => { e.stopPropagation(); moveLayer(index, 1); }}><ChevronDown size={12} /></button>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}
                      className="text-[#ef4444] hover:text-[#f87171] p-1 rounded hover:bg-[#ef4444]/10 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>

          <div className="flex-1 p-3">
             <p className="text-[10px] text-[#8E9299] leading-relaxed">
              提示：左侧工具栏可直接在地图上绘制矩形、多边形、文字等标绘。<br/><br/>图层越靠上索引越低（z序越下），越靠下索引越高（z序越上），如需调整直接点击列表右侧小箭头上下移动图层即可。这些标绘组件会在导出时被保存。
            </p>
          </div>
        </aside>

        {/* Central Map Area */}
        <main className="flex-1 relative bg-[#0B0C0E] overflow-auto">
          <div className="min-w-max min-h-max p-8 flex items-center justify-center" style={{ minWidth: '100%', minHeight: '100%' }}>
            
            {/* The Paper Container */}
            <div 
              ref={layoutRef}
              className={`bg-white shadow-2xl relative transition-all duration-300 export-container ${isExporting ? 'is-exporting' : ''}`}
              style={{ 
                width: `${layoutSize.w}px`, 
                height: `${layoutSize.h}px`,
                minWidth: `${layoutSize.w}px`,
                minHeight: `${layoutSize.h}px`,
              }}
            >
              {/* Outer Border */}
              <div className={`absolute inset-4 border-[3px] border-black p-1 bg-white`}>
                {/* Inner Border */}
                <div className={`border border-black w-full h-full relative overflow-hidden bg-gray-100`}>
                  
                  {/* The Map itself */}
                  <GeomanMap
                    layers={layers}
                    isExporting={isExporting}
                    updateLayer={updateLayer}
                    onScaleUpdate={setMapScale}
                    onVectorCreated={(id, name, shape, defaultStyle) => {
                      setLayers(prev => [{
                        id,
                        name: name,
                        visible: true,
                        type: 'vector',
                        shape: shape,
                        vectorStyle: defaultStyle,
                        textStyle: shape === 'Text' ? {
                          color: '#000000',
                          fontSize: 16,
                          backgroundColor: '#ffffff',
                          fontFamily: '"Microsoft YaHei", sans-serif',
                          fontWeight: 'normal',
                          multiline: false,
                          rotation: 0,
                          textAlign: 'left',
                          padding: 4
                        } : undefined
                      }, ...prev]);
                      setActiveItemId(id);
                    }}
                    onVectorRemoved={(id) => {
                      deleteLayer(id);
                    }}
                  />

                  {/* Overlays rendered on top. Reverse: index 0 (top of list) gets highest z-index = visually on top */}
                  {layers.slice().reverse().map((layer, reverseIdx) => {
                    if (!layer.visible) return null;
                    const zIndex = 1100 + reverseIdx;
                    
                    const commonRndProps = {
                      size: { width: layer.layoutConfig?.width || 'auto', height: layer.layoutConfig?.height || 'auto' },
                      position: { x: layer.layoutConfig?.x || 20, y: layer.layoutConfig?.y || 20 },
                      onDragStop: (e: any, d: any) => updateLayer(layer.id, { layoutConfig: { ...layer.layoutConfig, x: d.x, y: d.y } }),
                      onResizeStop: (e: any, direction: any, ref: any, delta: any, position: any) => {
                        updateLayer(layer.id, { layoutConfig: { x: position.x, y: position.y, width: ref.style.width, height: ref.style.height } });
                      },
                      disableDragging: isExporting,
                      enableResizing: !isExporting,
                      bounds: "parent",
                      style: { zIndex }
                    };

                    if ((layer.type === 'title' || layer.type === 'text') && layer.titleConfig) {
                      return (
                        <Rnd 
                          key={layer.id}
                          {...commonRndProps}
                          className={`absolute shadow-sm ${activeItemId === layer.id ? 'ring-2 ring-blue-500' : ''}`}
                          style={{ 
                            ...commonRndProps.style,
                          }}
                          onWheelCapture={(e: any) => e.stopPropagation()}
                          onDoubleClickCapture={(e: any) => { e.stopPropagation(); setEditingTextId(layer.id); }}
                          onClick={() => setActiveItemId(layer.id)}
                        >
                          <div 
                            contentEditable={editingTextId === layer.id && !isExporting}
                            suppressContentEditableWarning
                            onBlur={(e) => {
                               setEditingTextId(null);
                               updateLayer(layer.id, { titleConfig: { ...layer.titleConfig!, text: e.currentTarget.textContent || '' } });
                            }}
                            className={`outline-none w-full h-full leading-tight whitespace-pre-wrap ${editingTextId === layer.id ? 'cursor-text' : 'cursor-move'} ${layer.type === 'title' ? 'font-bold' : ''}`}
                            style={{ 
                              fontFamily: '"Microsoft YaHei", sans-serif',
                              fontSize: `${layer.titleConfig.fontSize}px`,
                              color: layer.titleConfig.color,
                              backgroundColor: layer.titleConfig.backgroundColor,
                              borderColor: layer.titleConfig.borderColor,
                              borderWidth: `${layer.titleConfig.borderWidth}px`,
                              borderStyle: layer.titleConfig.borderWidth > 0 ? 'solid' : 'transparent',
                              padding: `${layer.titleConfig.padding}px`,
                              transform: `rotate(${layer.titleConfig.rotation || 0}deg)`,
                              transformOrigin: 'center center'
                            }}
                          >
                            {layer.titleConfig.text}
                          </div>
                        </Rnd>
                      );
                    }

                    if (layer.type === 'compass' && layer.compassConfig) {
                      return (
                        <Rnd 
                          key={layer.id}
                          {...commonRndProps}
                          lockAspectRatio={true}
                          className={`absolute ${activeItemId === layer.id ? 'ring-2 ring-blue-500' : ''}`}
                          style={{ 
                            ...commonRndProps.style,
                            backgroundColor: layer.compassConfig.backgroundColor || 'transparent',
                            borderColor: layer.compassConfig.borderColor || '#000000',
                            borderWidth: `${layer.compassConfig.borderWidth || 0}px`,
                            borderStyle: layer.compassConfig.borderWidth ? 'solid' : 'none',
                            padding: `${layer.compassConfig.padding || 0}px`,
                            boxSizing: 'border-box'
                          }}
                          onWheelCapture={(e: any) => e.stopPropagation()}
                          onDoubleClickCapture={(e: any) => e.stopPropagation()}
                          onClick={() => setActiveItemId(layer.id)}
                        >
                          <div style={{ width: '100%', height: '100%', boxSizing: 'border-box' }}>
                            <CompassArrow color={layer.compassConfig.borderColor} />
                          </div>
                        </Rnd>
                      )
                    }

                    if (layer.type === 'scale' && layer.scaleConfig) {
                      const scaleW = mapScale.widthInPx;
                      const meters = mapScale.meters;
                      const extraWidth = 40; // Space for the text extending past the 100% mark
                      
                      return (
                        <Rnd 
                          key={layer.id}
                          {...commonRndProps}
                          size={{ 
                            width: scaleW + (layer.scaleConfig.padding || 0) * 2 + (layer.scaleConfig.borderWidth || 0) * 2 + extraWidth, 
                            height: 'auto' 
                          }}
                          enableResizing={!isExporting ? { right: true, left: true, top: false, bottom: false, topRight: false, topLeft: false, bottomRight: false, bottomLeft: false } : false}
                          className={`absolute ${activeItemId === layer.id ? 'ring-2 ring-blue-500' : ''}`}
                          style={{ 
                            ...commonRndProps.style,
                            height: 'auto'
                          }}
                          onWheelCapture={(e: any) => e.stopPropagation()}
                          onDoubleClickCapture={(e: any) => e.stopPropagation()}
                          onClick={() => setActiveItemId(layer.id)}
                        >
                          <div style={{ position: 'relative', width: '100%', height: 'max-content' }}>
                            {/* Background Box */}
                            <div style={{ 
                              position: 'absolute',
                              inset: 0,
                              background: layer.scaleConfig.backgroundColor,
                              border: `${layer.scaleConfig.borderWidth}px solid ${layer.scaleConfig.borderColor}`,
                              boxSizing: 'border-box'
                            }}></div>
                            
                            {/* Scale Content */}
                            <div style={{ 
                              position: 'relative',
                              color: layer.scaleConfig.color,
                              padding: layer.scaleConfig.padding,
                              paddingLeft: (layer.scaleConfig.padding || 0) + (extraWidth / 2),
                              paddingRight: (layer.scaleConfig.padding || 0) + (extraWidth / 2),
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              pointerEvents: 'none',
                              boxSizing: 'border-box'
                            }}>
                              <div style={{ position: 'relative', width: scaleW, marginBottom: 4, marginTop: 4 }}>
                                 <div style={{ borderBottom: '2px solid currentColor', borderLeft: '2px solid currentColor', borderRight: '2px solid currentColor', height: 6 }}></div>
                                 <div style={{ position: 'absolute', left: '33.33%', bottom: 0, height: 4, borderLeft: '1px solid currentColor' }}></div>
                                 <div style={{ position: 'absolute', left: '66.66%', bottom: 0, height: 4, borderLeft: '1px solid currentColor' }}></div>
                                 
                                 <div style={{ position: 'relative', height: 16, fontSize: 12, marginTop: 2, fontFamily: 'sans-serif', whiteSpace: 'nowrap' }}>
                                   <span style={{ position: 'absolute', left: 0, transform: 'translateX(-50%)' }}>0</span>
                                   <span style={{ position: 'absolute', left: '33.33%', transform: 'translateX(-50%)' }}>{Math.round(meters / 3)}</span>
                                   <span style={{ position: 'absolute', left: '66.66%', transform: 'translateX(-50%)' }}>{Math.round(meters * 2 / 3)}</span>
                                   <span style={{ position: 'absolute', left: '100%', transform: 'translateX(-50%)' }}>{meters} 米</span>
                                 </div>
                              </div>
                            </div>
                          </div>
                        </Rnd>
                      )
                    }

                    return null;
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Sidebar Right: Properties Inspector */}
        <aside className="w-72 border-l border-[#2A2D35] bg-[#151619] p-4 flex flex-col z-[1000] overflow-y-auto">
          <p className="text-[10px] text-[#8E9299] font-bold uppercase tracking-wider mb-4">属性面板</p>
          
          <div className="space-y-6">
            {/* Map Size Settings */}
            <div>
              <label className="text-[10px] text-[#8E9299] block mb-2">画布尺寸 / 导出分辨率</label>
              <select 
                value={layoutSize.id}
                onChange={(e) => setLayoutSize(PAGE_SIZES.find(s => s.id === e.target.value) || PAGE_SIZES[3])}
                className="w-full bg-[#1F2128] border border-[#2A2D35] text-xs text-white p-2 rounded outline-none focus:border-[#3B82F6]"
              >
                {PAGE_SIZES.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="h-px bg-[#2A2D35]"></div>

            {/* Properties View */}
            {activeLayer ? (
              <div>
                <label className="text-[10px] text-[#3B82F6] font-bold block mb-3 flex items-center gap-2">
                  <Settings size={12} /> {activeLayer.name} 设置
                </label>
                
                {(activeLayer.type === 'title' || activeLayer.type === 'text') && activeLayer.titleConfig && (
                  <div className="space-y-3 mt-3">
                    <div>
                      <label className="text-[10px] text-[#8E9299] block mb-1">文字内容</label>
                      <textarea 
                        rows={3}
                        value={activeLayer.titleConfig.text}
                        onChange={(e) => updateLayer(activeLayer.id, { titleConfig: { ...activeLayer.titleConfig!, text: e.target.value } })}
                        className="w-full bg-[#1F2128] border border-[#2A2D35] rounded p-2 text-xs font-mono text-white focus:border-[#3B82F6] outline-none resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8E9299] block mb-1">字号 ({activeLayer.titleConfig.fontSize}px)</label>
                      <input 
                        type="range" min="12" max="72" value={activeLayer.titleConfig.fontSize}
                        onChange={(e) => updateLayer(activeLayer.id, { titleConfig: { ...activeLayer.titleConfig!, fontSize: Number(e.target.value) } })}
                        className="w-full accent-[#3B82F6]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8E9299] block mb-1">内边距 ({activeLayer.titleConfig.padding}px)</label>
                      <input 
                        type="range" min="0" max="40" value={activeLayer.titleConfig.padding}
                        onChange={(e) => updateLayer(activeLayer.id, { titleConfig: { ...activeLayer.titleConfig!, padding: Number(e.target.value) } })}
                        className="w-full accent-[#3B82F6]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8E9299] block mb-1">边框宽度 ({activeLayer.titleConfig.borderWidth}px)</label>
                      <input 
                        type="range" min="0" max="10" value={activeLayer.titleConfig.borderWidth}
                        onChange={(e) => updateLayer(activeLayer.id, { titleConfig: { ...activeLayer.titleConfig!, borderWidth: Number(e.target.value) } })}
                        className="w-full accent-[#3B82F6]"
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[#8E9299] block mb-1">文字颜色</label>
                          <input type="color" value={parseColor(activeLayer.titleConfig.color).hex} onChange={e => updateLayer(activeLayer.id, { titleConfig: { ...activeLayer.titleConfig!, color: e.target.value } })} className="w-full h-8 bg-transparent cursor-pointer rounded border border-[#2A2D35]" />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#8E9299] block mb-1 flex justify-between items-center">
                            <span>边框颜色</span>
                            <button onClick={() => updateLayer(activeLayer.id, { titleConfig: { ...activeLayer.titleConfig!, borderWidth: 0 } })} className="text-[#3B82F6] hover:text-[#2563EB] text-[9px] px-1 py-0.5 rounded bg-[#3B82F6]/10">移除</button>
                          </label>
                          <input type="color" value={parseColor(activeLayer.titleConfig.borderColor).hex} onChange={e => updateLayer(activeLayer.id, { titleConfig: { ...activeLayer.titleConfig!, borderColor: e.target.value } })} className="w-full h-8 bg-transparent cursor-pointer rounded border border-[#2A2D35]" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] text-[#8E9299] block mb-1 flex justify-between items-center">
                            <span>背景颜色</span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateLayer(activeLayer.id, { titleConfig: { ...activeLayer.titleConfig!, backgroundColor: 'transparent' } })} className="text-[#3B82F6] hover:text-[#2563EB] text-[9px] px-1 py-0.5 rounded bg-[#3B82F6]/10">移除</button>
                              <span className="flex items-center gap-1">
                                <input type="color" value={parseColor(activeLayer.titleConfig.backgroundColor).hex} onChange={e => updateLayer(activeLayer.id, { titleConfig: { ...activeLayer.titleConfig!, backgroundColor: toRgba(e.target.value, parseColor(activeLayer.titleConfig!.backgroundColor).alpha) } })} className="w-4 h-4 p-0 border-none rounded-sm bg-transparent cursor-pointer" />
                                {(parseColor(activeLayer.titleConfig.backgroundColor).alpha * 100).toFixed(0)}%
                              </span>
                            </div>
                          </label>
                          <input 
                            type="range" min="0" max="1" step="0.05" value={parseColor(activeLayer.titleConfig.backgroundColor).alpha} 
                            onChange={e => updateLayer(activeLayer.id, { titleConfig: { ...activeLayer.titleConfig!, backgroundColor: toRgba(parseColor(activeLayer.titleConfig!.backgroundColor).hex, Number(e.target.value)) } })} 
                            className="w-full accent-[#3B82F6]" 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-[#8E9299] block mb-1 flex justify-between">
                            <span>旋转角度</span>
                            <span>{activeLayer.titleConfig.rotation || 0}°</span>
                        </label>
                        <input 
                          type="range" min="-180" max="180" step="1" value={activeLayer.titleConfig.rotation || 0} 
                          onChange={e => updateLayer(activeLayer.id, { titleConfig: { ...activeLayer.titleConfig!, rotation: Number(e.target.value) } })} 
                          className="w-full accent-[#3B82F6]" 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeLayer.type === 'compass' && activeLayer.compassConfig && (
                  <div className="space-y-3 mt-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[#8E9299] block mb-1">外框/文字颜色</label>
                          <input type="color" value={parseColor(activeLayer.compassConfig.borderColor || '#000000').hex} onChange={e => updateLayer(activeLayer.id, { compassConfig: { ...activeLayer.compassConfig!, borderColor: e.target.value } })} className="w-full h-8 bg-transparent cursor-pointer rounded border border-[#2A2D35]" />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#8E9299] block mb-1">背景颜色</label>
                          <input type="color" value={parseColor(activeLayer.compassConfig.backgroundColor || '#ffffff').hex} onChange={e => updateLayer(activeLayer.id, { compassConfig: { ...activeLayer.compassConfig!, backgroundColor: toRgba(e.target.value, parseColor(activeLayer.compassConfig!.backgroundColor || '#ffffff').alpha) } })} className="w-full h-8 bg-transparent cursor-pointer rounded border border-[#2A2D35]" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-[#8E9299] block mb-1 flex justify-between">
                            <span>背景透明度</span>
                            <span>{Math.round(parseColor(activeLayer.compassConfig.backgroundColor || '#ffffff').alpha * 100)}%</span>
                        </label>
                        <input 
                          type="range" min="0" max="1" step="0.05" value={parseColor(activeLayer.compassConfig.backgroundColor || '#ffffff').alpha} 
                          onChange={e => updateLayer(activeLayer.id, { compassConfig: { ...activeLayer.compassConfig!, backgroundColor: toRgba(parseColor(activeLayer.compassConfig!.backgroundColor || '#ffffff').hex, Number(e.target.value)) } })} 
                          className="w-full accent-[#3B82F6]" 
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-[#8E9299] block mb-1">外框粗细 ({activeLayer.compassConfig.borderWidth || 0}px)</label>
                        <input 
                            type="range" min="0" max="5" step="0.5" 
                            value={activeLayer.compassConfig.borderWidth || 0}
                            onChange={(e) => updateLayer(activeLayer.id, { 
                                compassConfig: { ...activeLayer.compassConfig!, borderWidth: Number(e.target.value) } 
                            })}
                            className="w-full accent-[#3B82F6]"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-[#8E9299] block mb-1">内边距 ({activeLayer.compassConfig.padding || 0}px)</label>
                        <input 
                            type="range" min="0" max="40" step="1" 
                            value={activeLayer.compassConfig.padding || 0}
                            onChange={(e) => updateLayer(activeLayer.id, { 
                                compassConfig: { ...activeLayer.compassConfig!, padding: Number(e.target.value) } 
                            })}
                            className="w-full accent-[#3B82F6]"
                        />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#8E9299]">请拖拽边框调整大小（保持宽高比）</p>
                    </div>
                  </div>
                )}

                {activeLayer.type === 'scale' && activeLayer.scaleConfig && (
                  <div className="space-y-3 mt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-[#8E9299] block mb-1">文字/边线颜色</label>
                        <input type="color" value={parseColor(activeLayer.scaleConfig.color).hex} onChange={e => updateLayer(activeLayer.id, { scaleConfig: { ...activeLayer.scaleConfig!, color: e.target.value } })} className="w-full h-8 bg-transparent cursor-pointer rounded border border-[#2A2D35]" />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#8E9299] block mb-1">背景颜色</label>
                        <input type="color" value={parseColor(activeLayer.scaleConfig.backgroundColor).hex} onChange={e => updateLayer(activeLayer.id, { scaleConfig: { ...activeLayer.scaleConfig!, backgroundColor: toRgba(e.target.value, parseColor(activeLayer.scaleConfig!.backgroundColor).alpha) } })} className="w-full h-8 bg-transparent cursor-pointer rounded border border-[#2A2D35]" />
                      </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-[#8E9299] block mb-1 flex justify-between">
                            <span>背景透明度</span>
                            <span>{Math.round(parseColor(activeLayer.scaleConfig.backgroundColor).alpha * 100)}%</span>
                        </label>
                        <input 
                          type="range" min="0" max="1" step="0.05" value={parseColor(activeLayer.scaleConfig.backgroundColor).alpha} 
                          onChange={e => updateLayer(activeLayer.id, { scaleConfig: { ...activeLayer.scaleConfig!, backgroundColor: toRgba(parseColor(activeLayer.scaleConfig!.backgroundColor).hex, Number(e.target.value)) } })} 
                          className="w-full accent-[#3B82F6]" 
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-[#8E9299] block mb-1">外框粗细 ({activeLayer.scaleConfig.borderWidth}px)</label>
                        <input 
                            type="range" min="0" max="5" step="0.5" 
                            value={activeLayer.scaleConfig.borderWidth}
                            onChange={(e) => updateLayer(activeLayer.id, { 
                                scaleConfig: { ...activeLayer.scaleConfig!, borderWidth: Number(e.target.value) } 
                            })}
                            className="w-full accent-[#3B82F6]"
                        />
                    </div>
                    <div>
                        <p className="text-[10px] text-[#8E9299] mt-2">提示: 请拖拽边框调整比例尺大小</p>
                    </div>
                  </div>
                )}

                {(activeLayer.type === 'vector' || activeLayer.type === 'kml') && activeLayer.shape !== 'Text' && (
                  <div className="space-y-3 mt-3">
                    {activeLayer.type === 'kml' && (
                       <div>
                          <label className="flex items-center gap-2 text-[10px] text-[#8E9299] cursor-pointer">
                              <input 
                                  type="checkbox" 
                                  checked={activeLayer.isClosedKml || false}
                                  onChange={(e) => updateLayer(activeLayer.id, { 
                                      isClosedKml: e.target.checked
                                  })}
                                  className="accent-[#3B82F6]"
                              />
                              闭合图形并填充
                          </label>
                       </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                       <div>
                        <label className="text-[10px] text-[#8E9299] block mb-1">线条颜色</label>
                        <input 
                          type="color" 
                          value={activeLayer.vectorStyle?.color || activeLayer.color || '#ff0000'} 
                          onChange={e => updateLayer(activeLayer.id, { 
                            vectorStyle: { ...(activeLayer.vectorStyle as any), color: e.target.value },
                            color: e.target.value
                          })} 
                          className="w-full h-8 bg-transparent cursor-pointer rounded border border-[#2A2D35]" 
                        />
                      </div>
                      {(activeLayer.type === 'vector' || (activeLayer.type === 'kml' && activeLayer.isClosedKml)) && (
                        <div>
                          <label className="text-[10px] text-[#8E9299] block mb-1">填充颜色</label>
                          <input 
                            type="color" 
                            value={activeLayer.vectorStyle?.fillColor || '#ff0000'} 
                            onChange={e => updateLayer(activeLayer.id, { 
                              vectorStyle: { ...activeLayer.vectorStyle!, fillColor: e.target.value } 
                            })} 
                            className="w-full h-8 bg-transparent cursor-pointer rounded border border-[#2A2D35]" 
                          />
                        </div>
                      )}
                    </div>
                    {(activeLayer.type === 'vector' || activeLayer.type === 'kml') && (
                      <>
                        <div>
                          <label className="text-[10px] text-[#8E9299] block mb-1">线条宽度 ({activeLayer.vectorStyle?.weight}px)</label>
                          <input 
                            type="range" min="1" max="10" step="1" 
                            value={activeLayer.vectorStyle?.weight || 3}
                            onChange={(e) => updateLayer(activeLayer.id, { 
                                vectorStyle: { ...activeLayer.vectorStyle!, weight: Number(e.target.value) } 
                            })}
                            className="w-full accent-[#3B82F6]"
                          />
                        </div>
                        {(activeLayer.type === 'vector' || (activeLayer.type === 'kml' && activeLayer.isClosedKml)) && (
                          <div>
                            <label className="text-[10px] text-[#8E9299] block mb-1">填充透明度 ({activeLayer.vectorStyle?.fillOpacity})</label>
                            <input 
                              type="range" min="0" max="1" step="0.1" 
                              value={activeLayer.vectorStyle?.fillOpacity || 0.4}
                              onChange={(e) => updateLayer(activeLayer.id, { 
                                  vectorStyle: { ...activeLayer.vectorStyle!, fillOpacity: Number(e.target.value) } 
                              })}
                              className="w-full accent-[#3B82F6]"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {activeLayer.type === 'vector' && activeLayer.shape === 'Text' && activeLayer.textStyle && (
                   <div className="space-y-3 mt-3">
                    <div>
                      <label className="text-[10px] text-[#8E9299] block mb-1">文字内容</label>
                      <textarea
                        rows={2}
                        value={activeLayer.textStyle.text || ''}
                        onChange={(e) => updateLayer(activeLayer.id, {
                          textStyle: { ...activeLayer.textStyle!, text: e.target.value }
                        })}
                        className="w-full bg-[#1F2128] border border-[#2A2D35] rounded p-2 text-xs font-mono text-white focus:border-[#3B82F6] outline-none resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       <div>
                        <label className="text-[10px] text-[#8E9299] block mb-1">文字颜色</label>
                        <input 
                          type="color" 
                          value={activeLayer.textStyle.color} 
                          onChange={e => updateLayer(activeLayer.id, { 
                            textStyle: { ...activeLayer.textStyle!, color: e.target.value }
                          })} 
                          className="w-full h-8 bg-transparent cursor-pointer rounded border border-[#2A2D35]" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#8E9299] block mb-1">背景填充 (可选)</label>
                        <div className="flex gap-1">
                            <input 
                            type="color" 
                            value={activeLayer.textStyle.backgroundColor === 'transparent' ? '#ffffff' : activeLayer.textStyle.backgroundColor} 
                            onChange={e => updateLayer(activeLayer.id, { 
                                textStyle: { ...activeLayer.textStyle!, backgroundColor: e.target.value }
                            })} 
                            className="flex-1 h-8 bg-transparent cursor-pointer rounded border border-[#2A2D35]" 
                            />
                            <button 
                                onClick={() => updateLayer(activeLayer.id, { textStyle: { ...activeLayer.textStyle!, backgroundColor: 'transparent' } })}
                                className="px-2 bg-[#2A2D35] hover:bg-[#3B82F6] rounded text-xs transition-colors"
                            >
                                透明
                            </button>
                        </div>
                      </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-[#8E9299] block mb-1">字体</label>
                        <select 
                            value={activeLayer.textStyle.fontFamily}
                            onChange={(e) => updateLayer(activeLayer.id, { textStyle: { ...activeLayer.textStyle!, fontFamily: e.target.value } })}
                            className="w-full bg-[#1F2128] border border-[#2A2D35] text-xs text-white p-2 rounded outline-none focus:border-[#3B82F6]"
                        >
                            <option value='"Microsoft YaHei", sans-serif'>微软雅黑</option>
                            <option value='"SimSun", serif'>宋体</option>
                            <option value='"SimHei", sans-serif'>黑体</option>
                            <option value='"KaiTi", serif'>楷体</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] text-[#8E9299] block mb-1">字高 ({activeLayer.textStyle.fontSize}px)</label>
                        <input 
                            type="range" min="10" max="64" step="1" 
                            value={activeLayer.textStyle.fontSize}
                            onChange={(e) => updateLayer(activeLayer.id, { 
                                textStyle: { ...activeLayer.textStyle!, fontSize: Number(e.target.value) } 
                            })}
                            className="w-full accent-[#3B82F6]"
                        />
                    </div>
                    <div>
                        <label className="flex items-center gap-2 text-[10px] text-[#8E9299] cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={activeLayer.textStyle.fontWeight === 'bold'}
                                onChange={(e) => updateLayer(activeLayer.id, { 
                                    textStyle: { ...activeLayer.textStyle!, fontWeight: e.target.checked ? 'bold' : 'normal' } 
                                })}
                                className="accent-[#3B82F6]"
                            />
                            文字加粗
                        </label>
                        <label className="flex items-center gap-2 text-[10px] text-[#8E9299] cursor-pointer mt-2">
                            <input 
                                type="checkbox" 
                                checked={activeLayer.textStyle.multiline || false}
                                onChange={(e) => updateLayer(activeLayer.id, { 
                                    textStyle: { ...activeLayer.textStyle!, multiline: e.target.checked } 
                                })}
                                className="accent-[#3B82F6]"
                            />
                            允许多行文本
                        </label>
                    </div>
                    <div className="pt-3 border-t border-[#2A2D35] space-y-2">
                      <div>
                        <label className="text-[10px] text-[#8E9299] block mb-1 flex justify-between">
                          <span>旋转角度</span>
                          <span>{activeLayer.textStyle.rotation || 0}°</span>
                        </label>
                        <input
                          type="range" min="-180" max="180" step="1"
                          value={activeLayer.textStyle.rotation || 0}
                          onChange={e => updateLayer(activeLayer.id, {
                            textStyle: { ...activeLayer.textStyle!, rotation: Number(e.target.value) }
                          })}
                          className="w-full accent-[#3B82F6]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#8E9299] block mb-1">文字对齐</label>
                        <select
                          value={activeLayer.textStyle.textAlign || 'left'}
                          onChange={e => updateLayer(activeLayer.id, {
                            textStyle: { ...activeLayer.textStyle!, textAlign: e.target.value as 'left' | 'center' | 'right' }
                          })}
                          className="w-full bg-[#1F2128] border border-[#2A2D35] text-xs text-white p-2 rounded outline-none focus:border-[#3B82F6]"
                        >
                          <option value="left">左对齐</option>
                          <option value="center">居中</option>
                          <option value="right">右对齐</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-[#8E9299] block mb-1 flex justify-between">
                          <span>内边距</span>
                          <span>{activeLayer.textStyle.padding || 0}px</span>
                        </label>
                        <input
                          type="range" min="0" max="30" step="1"
                          value={activeLayer.textStyle.padding || 0}
                          onChange={e => updateLayer(activeLayer.id, {
                            textStyle: { ...activeLayer.textStyle!, padding: Number(e.target.value) }
                          })}
                          className="w-full accent-[#3B82F6]"
                        />
                      </div>
                    </div>
                    <div className="pt-3 border-t border-[#2A2D35]">
                      <p className="text-[10px] text-[#8E9299] font-bold mb-2">文本框尺寸 (像素，留空为自动)</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[#8E9299] block mb-1">宽度</label>
                          <input
                            type="number" min="0" step="10"
                            value={activeLayer.textStyle.boxWidth || ''}
                            placeholder="自动"
                            onChange={e => updateLayer(activeLayer.id, {
                              textStyle: { ...activeLayer.textStyle!, boxWidth: e.target.value ? Number(e.target.value) : undefined }
                            })}
                            className="w-full bg-[#1F2128] border border-[#2A2D35] rounded p-1.5 text-xs text-white focus:border-[#3B82F6] outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#8E9299] block mb-1">高度</label>
                          <input
                            type="number" min="0" step="10"
                            value={activeLayer.textStyle.boxHeight || ''}
                            placeholder="自动"
                            onChange={e => updateLayer(activeLayer.id, {
                              textStyle: { ...activeLayer.textStyle!, boxHeight: e.target.value ? Number(e.target.value) : undefined }
                            })}
                            className="w-full bg-[#1F2128] border border-[#2A2D35] rounded p-1.5 text-xs text-white focus:border-[#3B82F6] outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(activeLayer.type === 'tile' || activeLayer.type === 'vector' || activeLayer.type === 'kml') && (
                   <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-[#8E9299] block mt-3 mb-1">重命名图层</label>
                      <input 
                        type="text" 
                        value={activeLayer.name} 
                        onChange={(e) => updateLayer(activeLayer.id, { name: e.target.value })}
                        className="w-full bg-[#1F2128] border border-[#2A2D35] rounded p-2 text-xs text-white focus:border-[#3B82F6] outline-none"
                      />
                    </div>
                    {activeLayer.type === 'tile' && (
                      <div>
                        {activeTileSource ? (
                          <div className="mb-3 p-3 bg-[#1F2128] rounded border border-[#2A2D35]">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: activeTileSource.thumbnailColor || '#666' }} />
                              <span className="text-xs font-medium text-white">{activeTileSource.name}</span>
                            </div>
                            <p className="text-[10px] text-[#8E9299]">{activeTileSource.group} · zoomOffset: {activeTileSource.defaultOptions.zoomOffset}</p>
                            {activeLayer.sourceParams && Object.keys(activeLayer.sourceParams).length > 0 && (
                              <p className="text-[10px] text-[#3B82F6] mt-1">
                                {Object.entries(activeLayer.sourceParams).map(([k, v]) => (
                                  <span key={k} className="mr-2">{k}: {v ? '***已设置***' : '未设置'}</span>
                                ))}
                              </p>
                            )}
                          </div>
                        ) : activeLayer.url ? (
                          <div className="mb-3 p-3 bg-[#1F2128] rounded border border-[#2A2D35]">
                            <p className="text-[10px] text-[#8E9299]">自定义 URL 模式</p>
                            <code className="text-[10px] text-white break-all">{activeLayer.url}</code>
                          </div>
                        ) : (
                          <div className="mb-3 p-3 bg-[#1F2128] rounded border border-[#2A2D35]">
                            <p className="text-[10px] text-[#F59E0B]">未配置图源，请点击下方按钮选择</p>
                          </div>
                        )}

                        <button
                          onClick={() => setIsSourceManagerOpen(true)}
                          className="w-full py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs rounded transition-colors mb-3 flex items-center justify-center gap-2"
                        >
                          <Layers size={14} /> 管理图源
                        </button>

                        <div className="border-t border-[#2A2D35] pt-3">
                          <label className="text-[10px] text-[#8E9299] block mb-1">自定义瓦片 URL（覆盖图源预设）</label>
                          <form key={`${activeLayer.id}-${activeLayer.url}`} onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const url = formData.get('url') as string;
                            updateLayer(activeLayer.id, { url, sourceId: undefined });
                          }} className="flex flex-col gap-2">
                            <textarea
                              rows={3}
                              name="url"
                              defaultValue={activeLayer.url || ''}
                              placeholder="支持标准XYZ格式({z}/{x}/{y})或WMTS格式..."
                              className="w-full bg-[#1F2128] border border-[#2A2D35] rounded p-2 text-xs font-mono text-white focus:border-[#3B82F6] outline-none resize-none"
                            />
                            <button type="submit" className="py-1.5 bg-[#2A2D35] hover:bg-gray-600 text-white text-[11px] rounded transition-colors">
                              加载自定义 URL
                            </button>
                          </form>
                          <p className="text-[10px] text-[#8E9299] mt-2 leading-relaxed">
                            提示: 支持 <code className="text-gray-400">{'{z}/{x}/{y}'}</code> XYZ 和 <code className="text-gray-400">{'{TileMatrix}/{TileRow}/{TileCol}'}</code> WMTS 格式。设置自定义 URL 会覆盖图源预设。
                          </p>
                        </div>
                      </div>
                    )}
                   </div>
                )}

                {/* Refit bounds tool for Vector/KML */}
                {(activeLayer.type === 'kml' || activeLayer.type === 'vector') && (
                  <>
                    <div className="h-px bg-[#2A2D35] mt-6 mb-4"></div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-[#8E9299] block mb-1">快捷工具</label>
                      <button 
                        className="flex items-center justify-center gap-2 w-full py-2 bg-[#2A2D35] hover:bg-[#3B82F6] rounded text-xs transition-colors text-white"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('map-refit-kml', { detail: { id: activeItemId } }));
                        }}
                      >
                        <Monitor size={14} /> 缩放至选中图层范围
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs text-[#8E9299]">请在左侧选择图层以编辑其属性。</p>
            )}

          </div>
        </aside>

      </div>

      {/* Tile Source Manager Modal */}
      <TileSourceManager
        isOpen={isSourceManagerOpen}
        onClose={() => setIsSourceManagerOpen(false)}
        tileLayers={layers.filter(l => l.type === 'tile')}
        onUpdateLayer={updateLayer}
        onAddTileLayer={addTileLayer}
        onDeleteLayer={deleteLayer}
      />
    </div>
  );
}
