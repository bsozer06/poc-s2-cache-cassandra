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
import Text from 'ol/style/Text';
import Cluster from 'ol/source/Cluster';
import 'ol/ol.css';

const DEVICES_API_URL = 'http://localhost:8000/devices-in-range?date=2026-02-02&start=2026-02-02T00:00:00&end=2026-02-02T23:59:59';
const API_URL = 'http://localhost:8000/all-locations?date=2026-02-02&start=2026-02-02T00:00:00&end=2026-02-02T23:59:59';

const App: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {

    // async function fetchDevices() {
    //   const response = await fetch(DEVICES_API_URL);
    //   const devices = await response.json();
    //   console.log('API devices:', devices);
    //   return devices;
    // }

    async function fetchLocations() {
      const response = await fetch(DEVICES_API_URL);
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

      // Nokta marker'ları
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
              feature.set('weight', 1);
              feature.set('device_id', loc.device_id);
              feature.set('timestamp', loc.timestamp);
              return feature;
            })
        : [];
      console.log('Marker count:', features.length);


      // Cluster için kaynak oluştur
      const markerSource = new VectorSource({ features });
      const clusterSource = new Cluster({
        distance: 40,
        source: markerSource
      });
      const clusterLayer = new VectorLayer({
        source: clusterSource,
        style: function (feature) {
          const features = feature.get('features');
          const size = features.length;
          if (size === 1) {
            // Tek marker ise orijinal stilini kullan
            return features[0].getStyle();
          }
          // Cluster içindeki en çok bulunan device_id'yi bul
          const deviceCount = {};
          features.forEach((f) => {
            const deviceId = f.get('device_id');
            if (deviceId) deviceCount[deviceId] = (deviceCount[deviceId] || 0) + 1;
          });
          let maxDevice = null;
          let maxCount = 0;
          Object.entries(deviceCount).forEach(([deviceId, count]) => {
            if (count > maxCount) {
              maxDevice = deviceId;
              maxCount = count;
            }
          });
          const color = maxDevice ? getColor(maxDevice) : '#34495e';
          return new Style({
            image: new CircleStyle({
              radius: 12,
              fill: new Fill({ color }),
              stroke: new Stroke({ color: '#fff', width: 2 })
            }),
            text: new Text({
              text: size.toString(),
              fill: new Fill({ color: '#fff' })
            })
          });
        }
      });
      const map = new Map({
        target: mapRef.current!,
        layers: [
          new TileLayer({ source: new OSM() }),
          clusterLayer
        ],
        view: new View({
          center: fromLonLat([32.86, 39.93]),
          zoom: 12
        })
      });
      // Marker'lar varsa haritayı otomatik olarak o noktaları kapsayacak şekilde zoomla
      if (features.length > 0) {
        const extent = markerSource.getExtent();
        map.getView().fit(extent, { padding: [40, 40, 40, 40], maxZoom: 16, duration: 1000 });
      }
    }

    initMap();
  }, []);

  return <div ref={mapRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default App;
