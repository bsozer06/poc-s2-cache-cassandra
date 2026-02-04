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
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';

const today = new Date();
const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
// ISO 8601 formatında başlangıç ve bitiş tarihleri
const startOfDay = `1970-01-21T00:00:00`;
// const startOfDay = `${dateStr}T00:00:00`;
const endOfDay = `2026-02-04T23:59:59`;
// const endOfDay = `${dateStr}T23:59:59`;
const DEVICES_API_URL = `http://localhost:8000/devices-in-range?date=${dateStr}&start=${startOfDay}&end=${endOfDay}`;
const API_URL = `http://localhost:8000/all-locations?date=${dateStr}&start=${startOfDay}&end=${endOfDay}`;

const App: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);

  const [deviceCounts, setDeviceCounts] = React.useState<{ device_id: string, count: number }[]>([]);
  const [distanceData, setDistanceData] = React.useState<{ device_id: string, total_distance_m: number }[]>([]);

  useEffect(() => {

    async function fetchLocations() {
      const response = await fetch(DEVICES_API_URL);
      return await response.json();
    }

    async function initMap() {
            // Bar chart için her cihazın toplam yolunu çek
            const today = new Date();
            const date = today.toISOString().slice(0, 10); // YYYY-MM-DD formatında bugünün tarihi
            const deviceIds = ['dev001', 'dev002', 'dev003', 'dev004', 'dev005'];
            const summaryResults: { device_id: string, total_distance_m: number }[] = [];
            for (const device_id of deviceIds) {
              try {
                const resp = await fetch(`http://localhost:8000/device-summary?device_id=${device_id}&date=${date}`);
                const data = await resp.json();
                summaryResults.push({ device_id, total_distance_m: data.total_distance_m || 0 });
              } catch {
                summaryResults.push({ device_id, total_distance_m: 0 });
              }
            }
            setDistanceData(summaryResults);
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

      // Pie chart için device türü dağılımı
      if (Array.isArray(locations)) {
        const counts: Record<string, number> = {};
        locations.forEach((loc: any) => {
          if (loc.device_id) counts[loc.device_id] = (counts[loc.device_id] || 0) + 1;
        });
        setDeviceCounts(Object.entries(counts).map(([device_id, count]) => ({ device_id, count })));
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

  // Pie chart için özel label fonksiyonu
  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.7;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#222" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={13} fontWeight={600}>
        {name}: {(percent * 100).toFixed(0)}%
      </text>
    );
  };

  // Bar chart için özel label fonksiyonu
  const renderBarLabel = (props) => {
    const { x, y, width, value } = props;
    return (
      <text x={x + width + 8} y={y + 10} fill="#222" fontSize={13} fontWeight={600}>{(value/1000).toFixed(2)} km</text>
    );
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div ref={mapRef} style={{ width: '100vw', height: '100vh' }} />
      <div style={{ position: 'absolute', top: 20, right: 20, width: 370, background: 'rgba(255,255,255,0.98)', borderRadius: 18, boxShadow: '0 4px 16px #0002', padding: 20, border: '1px solid #eee' }}>
        <h4 style={{ textAlign: 'center', margin: 0, fontWeight: 700, letterSpacing: 0.5 }}>Device Type Distribution</h4>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={deviceCounts}
              dataKey="count"
              nameKey="device_id"
              cx="50%"
              cy="50%"
              outerRadius={75}
              innerRadius={35}
              label={renderPieLabel}
              labelLine={false}
              stroke="#fff"
              strokeWidth={2}
            >
              {deviceCounts.map((entry, idx) => (
                <Cell key={entry.device_id} fill={
                  entry.device_id === 'dev001' ? '#e74c3c' :
                  entry.device_id === 'dev002' ? '#3498db' :
                  entry.device_id === 'dev003' ? '#2ecc71' :
                  entry.device_id === 'dev004' ? '#f1c40f' :
                  entry.device_id === 'dev005' ? '#9b59b6' : '#34495e'
                } />
              ))}
            </Pie>
            <Tooltip formatter={(v, n, p) => `${v} adet`} />
            <Legend iconType="circle" align="center" verticalAlign="bottom" wrapperStyle={{ fontSize: 13 }} />
          </PieChart>
        </ResponsiveContainer>
        <h4 style={{ textAlign: 'center', margin: '18px 0 0 0', fontWeight: 700, letterSpacing: 0.5 }}>Total Distance by Device</h4>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={distanceData} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }} barCategoryGap={18}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={v => `${(v/1000).toFixed(1)} km`} axisLine={false} tickLine={false} fontSize={12} />
            <YAxis type="category" dataKey="device_id" width={60} axisLine={false} tickLine={false} fontSize={13} />
            <Tooltip formatter={v => `${(v/1000).toFixed(2)} km`} />
            <Bar dataKey="total_distance_m" radius={[8, 8, 8, 8]}>
              <LabelList dataKey="total_distance_m" content={renderBarLabel} />
              {distanceData.map((entry) => (
                <Cell key={entry.device_id} fill={
                  entry.device_id === 'dev001' ? '#e74c3c' :
                  entry.device_id === 'dev002' ? '#3498db' :
                  entry.device_id === 'dev003' ? '#2ecc71' :
                  entry.device_id === 'dev004' ? '#f1c40f' :
                  entry.device_id === 'dev005' ? '#9b59b6' : '#34495e'
                } />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default App;
