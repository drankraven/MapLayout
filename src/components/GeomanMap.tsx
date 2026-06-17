import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import { kml } from '@tmcw/togeojson';
import { resolveTileSource, normalizeTileUrl, getTileSourceFromCatalog } from '../lib/tileSources';
import { normalizeGeoJsonInput } from '../lib/geojsonUtils';
import {
  createClosedLineFillFeatureCollection,
  createImportedFeatureStyle,
  createImportedPointStyle,
} from '../lib/vectorLayerStyle';
import { applyVectorTextStyle } from '../lib/vectorTextStyle';
import type { FeatureCollection } from 'geojson';

// @ts-ignore
import icon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
// @ts-ignore
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import { LayerConfig } from '../App';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconRetinaUrl: iconRetina,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface GeomanMapProps {
  layers: LayerConfig[];
  isExporting: boolean;
  updateLayer?: (id: string, updates: Partial<LayerConfig>) => void;
  onVectorCreated: (id: string, name: string, shape: string, defaultStyle: any) => void;
  onVectorRemoved: (id: string) => void;
  onScaleUpdate?: (scaleData: { meters: number, widthInPx: number }) => void;
}

const getLegacyKmlGeoJson = (kmlData?: string): FeatureCollection | null => {
  if (!kmlData) return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlData, 'text/xml');
  return normalizeGeoJsonInput(kml(doc));
};

const GeoJsonDataLayerRenderer: React.FC<{ layer: LayerConfig }> = ({ layer }) => {
  const map = useMap();
  const layerRef = useRef<L.FeatureGroup | null>(null);
  const hasLoadedBoundsRef = useRef(false);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!layer.visible) return;

    try {
      const geojson = layer.geojsonData || getLegacyKmlGeoJson(layer.kmlData);
      if (!geojson) return;

      const styleOptions = {
        color: layer.vectorStyle?.color || layer.color || 'red',
        fillColor: layer.vectorStyle?.fillColor || layer.color || 'red',
        weight: layer.vectorStyle?.weight || 3,
        fillOpacity: layer.vectorStyle?.fillOpacity ?? 0.4,
        fillEnabled: Boolean(layer.isClosedKml),
      };
      const getStyle = (feature?: GeoJSON.Feature): L.PathOptions => (
        createImportedFeatureStyle(feature?.geometry, styleOptions)
      );

      const featureGroup = L.featureGroup().addTo(map);
      const closedLineFillGeojson = styleOptions.fillEnabled
        ? createClosedLineFillFeatureCollection(geojson)
        : null;

      if (closedLineFillGeojson && closedLineFillGeojson.features.length > 0) {
        L.geoJSON(closedLineFillGeojson, {
          style: (feature?: GeoJSON.Feature): L.PathOptions => ({
            ...createImportedFeatureStyle(feature?.geometry, styleOptions),
            stroke: false,
          }),
        }).addTo(featureGroup);
      }

      L.geoJSON(geojson, {
        style: getStyle,
        pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
          ...createImportedPointStyle({
            ...styleOptions,
            fillOpacity: layer.vectorStyle?.fillOpacity ?? 0.7,
          }),
        }),
      }).addTo(featureGroup);

      layerRef.current = featureGroup;

      const bounds = featureGroup.getBounds();
      if (bounds.isValid()) {
        const el = document.getElementById(`layer-${layer.id}`);
        if (el) {
          el.dataset.lat1 = bounds.getSouthWest().lat.toString();
          el.dataset.lng1 = bounds.getSouthWest().lng.toString();
          el.dataset.lat2 = bounds.getNorthEast().lat.toString();
          el.dataset.lng2 = bounds.getNorthEast().lng.toString();
        }
        if (!hasLoadedBoundsRef.current) {
          map.fitBounds(bounds);
          hasLoadedBoundsRef.current = true;
        }
      }
    } catch (error) {
      console.error("Error rendering GeoJSON data layer:", error);
    }

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [layer.geojsonData, layer.kmlData, layer.visible, layer.color, layer.isClosedKml, layer.vectorStyle, map, layer.id]);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail.id === layer.id && layerRef.current) {
        layerRef.current.bringToFront();
      }
    };
    window.addEventListener('kml-bring-to-front', handler);
    return () => window.removeEventListener('kml-bring-to-front', handler);
  }, [layer.id]);

  return <div id={`layer-${layer.id}`} style={{ display: 'none' }} />;
};
const GeomanSetup = ({
  layers,
  onVectorCreated,
  onVectorRemoved,
  onScaleUpdate,
}: {
  layers: LayerConfig[],
  onVectorCreated: (id: string, name: string, shape: string, defaultStyle: any) => void;
  onVectorRemoved: (id: string) => void;
  onScaleUpdate?: (scaleData: { meters: number, widthInPx: number }) => void;
}) => {
  const map = useMap();
  const vectorLayersRef = useRef<Map<string, any>>(new Map());

  // Setup tools and handle creation
  useEffect(() => {
    // Create a shared pane so all vector layers (paths, markers, text) sort together
    const vectorPane = map.createPane('geoman-vectors');
    if (vectorPane) vectorPane.style.zIndex = '450';

    map.pm.addControls({
      position: 'topleft',
      drawMarker: true,
      drawCircleMarker: false,
      drawPolyline: true,
      drawRectangle: true,
      drawPolygon: true,
      drawCircle: false,
      drawText: true,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: true,
    });

    const defaultStyle = { color: '#3B82F6', fillColor: '#3B82F6', weight: 4, fillOpacity: 0.4, pane: 'geoman-vectors' };
    map.pm.setPathOptions(defaultStyle);

    const handleCreate = (e: any) => {
      const id = 'vector-' + Date.now();
      const pmlayer = e.layer;

      // Move markers and text into the shared pane so bringToFront works across all shape types
      if ((e.shape === 'Marker' || e.shape === 'Text') && pmlayer.options) {
        pmlayer.options.pane = 'geoman-vectors';
        map.removeLayer(pmlayer);
        pmlayer.addTo(map);
      }

      vectorLayersRef.current.set(id, pmlayer);

      let name = '图形标绘';
      if (e.shape === 'Rectangle') name = '矩形';
      if (e.shape === 'Polygon') name = '多边形';
      if (e.shape === 'Line') name = '线段';
      if (e.shape === 'Marker') name = '标记点';
      if (e.shape === 'Text') name = '文字标注';

      if (pmlayer.setStyle) pmlayer.setStyle(defaultStyle);

      pmlayer.on('pm:remove', () => {
        vectorLayersRef.current.delete(id);
        onVectorRemoved(id);
      });

      if (e.shape === 'Text') {
        pmlayer.on('pm:edit', () => {
          const text = pmlayer.pm?.getText?.() || '';
          window.dispatchEvent(new CustomEvent('vector-text-edit', { detail: { id, text } }));
        });
        pmlayer.on('pm:textchange', () => {
          const el = pmlayer.pm?.getElement?.();
          if (!el) return;
          if (el.dataset.boxWidth) {
            el.style.width = el.dataset.boxWidth + 'px';
            el.style.minWidth = el.dataset.boxWidth + 'px';
          }
          if (el.dataset.boxHeight) {
            el.style.height = el.dataset.boxHeight + 'px';
            el.style.minHeight = el.dataset.boxHeight + 'px';
          }
        });
      }

      onVectorCreated(id, name, e.shape, defaultStyle);
    };

    map.on('pm:create', handleCreate);

    const refitBounds = (e: any) => {
      const id = e.detail?.id;
      if (id) {
        const el = document.getElementById(`layer-${id}`);
        if (el && el.dataset.lat1 && el.dataset.lng1 && el.dataset.lat2 && el.dataset.lng2) {
           const bounds = L.latLngBounds(
             [parseFloat(el.dataset.lat1), parseFloat(el.dataset.lng1)],
             [parseFloat(el.dataset.lat2), parseFloat(el.dataset.lng2)]
           );
           map.fitBounds(bounds);
        } else {
           const vLayer = vectorLayersRef.current.get(id);
           if (vLayer) {
              if (vLayer.getBounds) {
                 map.fitBounds(vLayer.getBounds());
              } else if (vLayer.getLatLng) {
                 map.setView(vLayer.getLatLng(), Math.max(map.getZoom() || 14, 16));
              }
           }
        }
      }
    };
    window.addEventListener('map-refit-kml', refitBounds);

    return () => {
      map.pm.removeControls();
      map.off('pm:create', handleCreate);
      window.removeEventListener('map-refit-kml', refitBounds);
    }
  }, [map, onVectorCreated, onVectorRemoved]);

  // Sync state to Leaflet representations
  useEffect(() => {
    const vectorIds = [...layers].filter(l => l.type === 'vector' || l.type === 'kml').map(l => l.id);
    const reversedVectorIds = [...vectorIds].reverse();

    const layerIds = new Set(layers.map(l => l.id));
    for (const [id, vLayer] of vectorLayersRef.current.entries()) {
      if (!layerIds.has(id)) {
        map.removeLayer(vLayer);
        vectorLayersRef.current.delete(id);
      }
    }

    layers.forEach(l => {
      if (l.type === 'vector') {
        const vLayer = vectorLayersRef.current.get(l.id);
        if (vLayer) {
          if (l.shape === 'Text' && l.textStyle) {
            const el = vLayer.pm?.getElement?.();
            if (el) {
              applyVectorTextStyle({
                element: el,
                icon: vLayer._icon as HTMLElement | undefined,
                iconOptions: vLayer.options.icon?.options,
                setText: (text) => vLayer.pm?.setText?.(text),
                textStyle: l.textStyle,
              });
            }
          } else if (l.vectorStyle && vLayer.setStyle) {
            vLayer.setStyle(l.vectorStyle);
          }

          if (vLayer.getElement) {
            const el = vLayer.getElement();
            if (el) el.style.display = l.visible ? '' : 'none';
          } else if (vLayer._icon) {
            vLayer._icon.style.display = l.visible ? '' : 'none';
          }
        }
      }
    });

    reversedVectorIds.forEach(id => {
      const l = layers.find(layer => layer.id === id);
      if (!l || !l.visible) return;

      const vLayer = vectorLayersRef.current.get(id);
      if (vLayer && vLayer.bringToFront) {
        vLayer.bringToFront();
      }
      window.dispatchEvent(new CustomEvent('kml-bring-to-front', { detail: { id } }));
    });

  }, [layers]);

  // Manage scale
  useEffect(() => {
    if (!onScaleUpdate) return;

    const dummyScale = L.control.scale() as any;

    const updateScale = () => {
        const scaleLayer = layers.find(l => l.type === 'scale');
        let targetWidth = 150;
        if (scaleLayer && scaleLayer.layoutConfig?.width) {
          if (typeof scaleLayer.layoutConfig.width === 'number') {
            targetWidth = scaleLayer.layoutConfig.width - (scaleLayer.scaleConfig?.padding || 0) * 2;
          } else if (typeof scaleLayer.layoutConfig.width === 'string' && scaleLayer.layoutConfig.width.endsWith('px')) {
            targetWidth = parseFloat(scaleLayer.layoutConfig.width) - (scaleLayer.scaleConfig?.padding || 0) * 2;
          }
        }
        targetWidth = Math.max(50, targetWidth);

        const y = map.getSize().y / 2;
        const maxMeters = map.distance(
            map.containerPointToLatLng([0, y]),
            map.containerPointToLatLng([targetWidth, y])
        );

        let meters = Number(dummyScale._getRoundNum(maxMeters));
        if (isNaN(meters) || meters === 0) meters = 100;

        const ratio = meters / maxMeters;
        const widthInPx = targetWidth * ratio;

        onScaleUpdate({ meters, widthInPx });
    };

    map.on('moveend zoomend resize', updateScale);
    updateScale();

    return () => {
      map.off('moveend zoomend resize', updateScale);
    };
  }, [map, onScaleUpdate, layers]);

  return null;
};

const ZoomDisplay: React.FC<{ isExporting?: boolean }> = ({ isExporting }) => {
  if (isExporting) return null;
  const map = useMap();
  const [info, setInfo] = useState({ zoom: map.getZoom(), lat: map.getCenter().lat, lng: map.getCenter().lng });

  useEffect(() => {
    const update = () => setInfo({ zoom: map.getZoom(), lat: map.getCenter().lat, lng: map.getCenter().lng });
    map.on('moveend zoomend', update);
    return () => { map.off('moveend zoomend', update); };
  }, [map]);

  return (
    <div className="leaflet-bottom leaflet-right">
      <div className="leaflet-control bg-black/70 text-white text-xs px-2 py-1 rounded m-1 font-mono">
        层级 {info.zoom} · {info.lng.toFixed(4)}, {info.lat.toFixed(4)}
      </div>
    </div>
  );
};

export const GeomanMap: React.FC<GeomanMapProps> = ({ layers, isExporting, updateLayer, onVectorCreated, onVectorRemoved, onScaleUpdate }) => {
  return (
    <div className={`w-full h-full relative ${isExporting ? 'hide-leaflet-controls' : ''}`}>
      <MapContainer
        center={[39.9042, 116.4074]}
        zoom={14}
        style={{ height: '100%', width: '100%', backgroundColor: '#f3f4f6' }}
        zoomControl={false}
        attributionControl={false}
        crossOrigin={true}
      >
        <ZoomDisplay isExporting={isExporting} />
        {layers.map((layer, index) => {
          if (layer.type === 'tile' && layer.visible && (layer.url || layer.sourceId)) {
            let resolvedUrl: string;
            let subdomains: string[] | undefined;
            let catDefaults: ReturnType<typeof getTileSourceFromCatalog>['defaultOptions'] | null = null;

            if (layer.sourceId) {
              const resolved = resolveTileSource(layer.sourceId, layer.sourceParams);
              if (!resolved) return null;
              resolvedUrl = resolved.url;
              subdomains = resolved.subdomains;
              catDefaults = getTileSourceFromCatalog(layer.sourceId)?.defaultOptions ?? null;
            } else {
              resolvedUrl = normalizeTileUrl(layer.url!);
            }

            const zoomOffset = layer.zoomOffset ?? catDefaults?.zoomOffset ?? 0;
            const tileSize = layer.tileSize ?? catDefaults?.tileSize ?? 256;
            const maxZoom = catDefaults?.maxZoom ?? 21;
            const minZoom = layer.minZoom ?? catDefaults?.minZoom ?? 1;
            const maxNativeZoom = layer.maxNativeZoom ?? catDefaults?.maxNativeZoom ?? 18;

            return (
              <TileLayer
                key={`${layer.id}-${layer.sourceId || 'custom'}-${JSON.stringify(layer.sourceParams || {})}`}
                url={resolvedUrl}
                maxZoom={maxZoom}
                maxNativeZoom={maxNativeZoom}
                minZoom={minZoom}
                zoomOffset={zoomOffset}
                tileSize={tileSize}
                keepBuffer={4}
                updateWhenIdle={false}
                crossOrigin="anonymous"
                zIndex={1000 - index}
                {...(subdomains && subdomains.length > 0 ? { subdomains } : {})}
                attribution={layer.attribution || (layer.sourceId ? getTileSourceFromCatalog(layer.sourceId)?.attribution : undefined)}
              />
            );
          }
          if (layer.type === 'kml' && (layer.geojsonData || layer.kmlData)) {
             return <GeoJsonDataLayerRenderer key={layer.id} layer={layer} />;
          }
          return null;
        })}

        <GeomanSetup
          layers={layers}
          onVectorCreated={onVectorCreated}
          onVectorRemoved={onVectorRemoved}
          onScaleUpdate={onScaleUpdate}
        />
      </MapContainer>
    </div>
  );
};
