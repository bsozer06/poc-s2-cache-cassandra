import React, { useEffect, useRef } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import { Tile as TileLayer } from 'ol/layer';
import OSM from 'ol/source/OSM';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';
import { Icon, Style } from 'ol/style';
import { Circle as CircleStyle, Fill, Stroke } from 'ol/style';
import 'ol/ol.css';

const API_URL = 'http://localhost:8000/locations?device_id=dev001&start=2026-02-02T10:00:00&end=2026-02-02T11:00:00';

const App: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchLocations() {
      const response = await fetch(API_URL);
      return await response.json();
    }

    async function initMap() {
      const locations = await fetchLocations();
      console.log('API locations:', locations);
      // Her device_id için farklı renkler
      const deviceColors: Record<string, string> = {
        dev001: '#e74c3c',
        dev002: '#3498db',
        dev003: '#2ecc71',
        dev004: '#f1c40f',
        dev005: '#9b59b6'
      };

      function getColor(deviceId: string) {
        return deviceColors[deviceId] || '#34495e';
      }

      const features = Array.isArray(locations)
        ? locations
            .filter((loc: any) => typeof loc.longitude === 'number' && typeof loc.latitude === 'number')
            .map((loc: any) => {
              const feature = new Feature({
                geometry: new Point(fromLonLat([loc.longitude, loc.latitude]))
              });
              feature.setStyle(
                new Style({
                  image: new CircleStyle({
                    radius: 7,
                    fill: new Fill({ color: getColor(loc.device_id) }),
                    stroke: new Stroke({ color: 'white', width: 2 })
                  })
                })
              );
              return feature;
            })
        : [];
      console.log('Marker count:', features.length);

      const vectorSource = new VectorSource({ features });
      const vectorLayer = new VectorLayer({ source: vectorSource });

      const map = new Map({
        target: mapRef.current!,
        layers: [
          new TileLayer({ source: new OSM() }),
          vectorLayer
        ],
        view: new View({
          center: fromLonLat([29.0, 41.0]),
          zoom: 8
        })
      });

      // Marker'lar varsa haritayı otomatik olarak o noktaları kapsayacak şekilde zoomla
      if (features.length > 0) {
        const extent = vectorSource.getExtent();
        map.getView().fit(extent, { padding: [40, 40, 40, 40], maxZoom: 16, duration: 1000 });
      }
    }

    initMap();
  }, []);

  return <div ref={mapRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default App;
