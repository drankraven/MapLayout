import React, { useState } from 'react';
import { X, Plus, Layers, Trash2, Eye, EyeOff } from 'lucide-react';
import { LayerConfig } from '../App';
import {
  TILE_SOURCE_CATALOG,
  getTileSourceGroups,
  getTileSourceFromCatalog,
  TileSourceConfig,
} from '../lib/tileSources';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tileLayers: LayerConfig[];
  onUpdateLayer: (id: string, updates: Partial<LayerConfig>) => void;
  onAddTileLayer: () => void;
  onDeleteLayer: (id: string) => void;
}

export const TileSourceManager: React.FC<Props> = ({
  isOpen,
  onClose,
  tileLayers,
  onUpdateLayer,
  onAddTileLayer,
  onDeleteLayer,
}) => {
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const groups = getTileSourceGroups();

  const selectedSource = selectedSourceId ? getTileSourceFromCatalog(selectedSourceId) : null;
  const selectedLayer = selectedLayerId ? tileLayers.find(l => l.id === selectedLayerId) : null;

  const selectSource = (id: string) => {
    setSelectedSourceId(id);
    // Pre-fill params from selected layer only if it already uses this exact source
    if (selectedLayer && selectedLayer.sourceId === id && selectedLayer.sourceParams) {
      setParamValues(prev => ({ ...selectedLayer!.sourceParams, ...prev }));
    } else if (selectedLayer?.sourceId !== id) {
      setParamValues({});
    }
  };

  const selectLayer = (id: string) => {
    setSelectedLayerId(id);
    const l = tileLayers.find(ly => ly.id === id);
    if (l?.sourceId) {
      setSelectedSourceId(l.sourceId);
      // Merge layer's saved params as base, keep any already-entered values for same source
      setParamValues(prev => ({
        ...(l.sourceParams || {}),
        ...(l.sourceId === selectedSourceId ? prev : {}),
      }));
    } else {
      setParamValues({});
    }
  };

  const applySourceToLayer = () => {
    const targetId = selectedLayerId || selectedLayer?.id;
    if (!selectedSource || !targetId) return;

    const missing = selectedSource.requiredParams.filter(k => !paramValues[k]);
    if (missing.length > 0) return; // require all params

    onUpdateLayer(targetId, {
      sourceId: selectedSource.id,
      sourceParams: { ...paramValues },
      name: selectedLayer?.name === '新瓦片图层' ? selectedSource.name : selectedLayer?.name,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#151619] border border-[#2A2D35] rounded-lg w-[820px] max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2A2D35] shrink-0">
          <h2 className="text-sm font-bold text-white">图源管理</h2>
          <button onClick={onClose} className="text-[#8E9299] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body: two columns */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left: Source Catalog */}
          <div className="w-80 border-r border-[#2A2D35] overflow-y-auto p-3 shrink-0">
            {groups.map(group => (
              <div key={group.key} className="mb-4">
                <p className="text-[10px] text-[#8E9299] font-bold uppercase mb-2">{group.name}</p>
                <div className="space-y-1">
                  {group.sources.map(src => (
                    <button
                      key={src.id}
                      onClick={() => selectSource(src.id)}
                      className={`w-full text-left p-2.5 rounded border transition-colors ${
                        selectedSourceId === src.id
                          ? 'bg-[#1F2128] border-[#3B82F6]'
                          : 'border-transparent hover:bg-[#1F2128]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm shrink-0"
                          style={{ backgroundColor: src.thumbnailColor || '#666' }}
                        />
                        <span className="text-xs text-white">{src.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {src.requiredParams.length > 0 && (
                          <span className="text-[9px] text-[#8E9299] bg-[#2A2D35] px-1.5 py-0.5 rounded">
                            需要 {src.requiredParams.join(', ')}
                          </span>
                        )}
                        {src.defaultOptions.zoomOffset > 0 && (
                          <span className="text-[9px] text-[#F59E0B]">zoomOffset: {src.defaultOptions.zoomOffset}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Right: Details + Layer Assignment */}
          <div className="flex-1 flex flex-col overflow-y-auto min-w-0">
            {selectedSource ? (
              <>
                {/* Source details */}
                <div className="p-4 border-b border-[#2A2D35] shrink-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-4 h-4 rounded-sm shrink-0"
                      style={{ backgroundColor: selectedSource.thumbnailColor || '#666' }}
                    />
                    <h3 className="text-sm font-medium text-white">{selectedSource.name}</h3>
                    <span className="text-[10px] text-[#8E9299]">{selectedSource.group}</span>
                  </div>

                  {selectedSource.attribution && (
                    <p className="text-[10px] text-[#8E9299] mb-2">{selectedSource.attribution}</p>
                  )}

                  {/* Token/key inputs */}
                  {selectedSource.requiredParams.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <p className="text-[10px] text-[#F59E0B] font-bold">需要填写以下参数才能正常加载：</p>
                      {selectedSource.requiredParams.map(key => (
                        <div key={key}>
                          <label className="text-[10px] text-[#8E9299] block mb-1">
                            {key === 'tk' ? '天地图 Key (tk)' : key === 'token' ? '星图云 Token' : key}
                          </label>
                          <input
                            type="text"
                            value={paramValues[key] || ''}
                            onChange={e => setParamValues(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder={`输入 ${key}...`}
                            className="w-full bg-[#1F2128] border border-[#2A2D35] rounded p-2 text-xs text-white focus:border-[#3B82F6] outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tile options display */}
                  <div className="mt-3 flex gap-3 text-[10px] text-[#8E9299]">
                    <span>zoomOffset: {selectedSource.defaultOptions.zoomOffset}</span>
                    <span>maxNativeZoom: {selectedSource.defaultOptions.maxNativeZoom}</span>
                    <span>tileSize: {selectedSource.defaultOptions.tileSize}</span>
                  </div>

                  {/* Apply button */}
                  <button
                    onClick={applySourceToLayer}
                    disabled={!selectedLayerId || selectedSource.requiredParams.some(k => !paramValues[k])}
                    className="w-full mt-3 py-2 bg-[#3B82F6] hover:bg-[#2563EB] disabled:bg-[#2A2D35] disabled:text-[#8E9299] text-white text-xs rounded transition-colors"
                  >
                    应用到选定图层
                  </button>
                </div>

                {/* Tile layer list */}
                <div className="flex-1 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] text-[#8E9299] font-bold uppercase">瓦片图层列表</p>
                    <button
                      onClick={() => {
                        onAddTileLayer();
                      }}
                      className="flex items-center gap-1 text-[10px] text-[#3B82F6] hover:text-white transition-colors"
                    >
                      <Plus size={12} /> 添加图层
                    </button>
                  </div>
                  <div className="space-y-1">
                    {tileLayers.map(l => {
                      const src = l.sourceId ? getTileSourceFromCatalog(l.sourceId) : null;
                      return (
                        <div
                          key={l.id}
                          onClick={() => selectLayer(l.id)}
                          className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                            selectedLayerId === l.id
                              ? 'bg-[#1F2128] border-[#3B82F6]'
                              : 'border-transparent hover:bg-[#1F2128]'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateLayer(l.id, { visible: !l.visible });
                              }}
                              className="shrink-0"
                            >
                              {l.visible
                                ? <Eye size={14} className="text-[#3B82F6]" />
                                : <EyeOff size={14} className="text-[#8E9299]" />}
                            </button>
                            <div className="min-w-0">
                              <div className="text-xs text-white truncate">{l.name}</div>
                              <div className="text-[9px] text-[#8E9299]">
                                {src ? `${src.group} · ${src.name}` : l.url ? '自定义 URL' : '未配置图源'}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteLayer(l.id);
                              if (selectedLayerId === l.id) setSelectedLayerId(null);
                            }}
                            className="text-[#ef4444] hover:text-[#f87171] p-1 rounded hover:bg-[#ef4444]/10"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                    {tileLayers.length === 0 && (
                      <p className="text-[10px] text-[#8E9299] text-center py-4">
                        暂无瓦片图层，点击"添加图层"创建
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-[#8E9299]">请在左侧选择一个图源</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
