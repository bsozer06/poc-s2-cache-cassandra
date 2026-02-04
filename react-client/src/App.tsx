import React, { useEffect, useRef, useState } from 'react';
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

interface LocationPoint {
  device_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
}

const today = new Date();
const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
// ISO 8601 format - start and end times
const startOfDay = `1970-01-21T00:00:00`;
// const startOfDay = `${dateStr}T00:00:00`;
const endOfDay = `2026-02-04T23:59:59`;
// const endOfDay = `${dateStr}T23:59:59`;
const DEVICES_API_URL = `http://localhost:8000/devices-in-range?date=${dateStr}&start=${startOfDay}&end=${endOfDay}`;
const API_URL = `http://localhost:8000/all-locations?date=${dateStr}&start=${startOfDay}&end=${endOfDay}`;

const App: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const initialMarkerSourceRef = useRef<VectorSource | null>(null);
  const realtimeMarkerSourceRef = useRef<VectorSource | null>(null);
  const realtimeFeaturesByDeviceRef = useRef<Map<string, Feature<Point>>>({});
  const lastLocationRef = useRef<Map<string, LocationPoint>>({}); // Track last locations

  const [deviceCounts, setDeviceCounts] = useState<{ device_id: string, count: number }[]>([]);
  const [distanceData, setDistanceData] = useState<{ device_id: string, total_distance_m: number }[]>([]);

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

  // Haversine formula - calculate distance between two locations (meters)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth radius (meters)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Setup WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      wsRef.current = new WebSocket('ws://localhost:8000/ws/locations');

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === 'location_update') {
          updateLocationOnMap(message);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected, reconnecting in 3 seconds...');
        setTimeout(connectWebSocket, 3000);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Update location on map (WebSocket real-time data)
  const updateLocationOnMap = (data: LocationPoint) => {
    if (!realtimeMarkerSourceRef.current) return;

    const deviceId = data.device_id;
    const newGeometry = new Point(fromLonLat([data.longitude, data.latitude]));

    // Update charts
    setDeviceCounts(prev => {
      const existing = prev.find(d => d.device_id === deviceId);
      if (existing) {
        return prev.map(d => 
          d.device_id === deviceId ? { ...d, count: d.count + 1 } : d
        );
      } else {
        return [...prev, { device_id: deviceId, count: 1 }];
      }
    });

    // Mesafe hesapla ve bar chart'ı güncelle
    if (lastLocationRef.current[deviceId]) {
      const lastLoc = lastLocationRef.current[deviceId];
      const distance = calculateDistance(
        lastLoc.latitude, lastLoc.longitude,
        data.latitude, data.longitude
      );
      
      setDistanceData(prev => {
        const existing = prev.find(d => d.device_id === deviceId);
        if (existing) {
          return prev.map(d => 
            d.device_id === deviceId 
              ? { ...d, total_distance_m: d.total_distance_m + distance } 
              : d
          );
        } else {
          return [...prev, { device_id: deviceId, total_distance_m: distance }];
        }
      });
    }

    // Son konumu kaydet
    lastLocationRef.current[deviceId] = data;

    // Harita marker'ını güncelle
    if (realtimeFeaturesByDeviceRef.current[deviceId]) {
      const existingFeature = realtimeFeaturesByDeviceRef.current[deviceId];
      existingFeature.setGeometry(newGeometry);
      existingFeature.set('timestamp', data.timestamp);
    } else {
      // Yeni bir marker oluştur (WebSocket verisi için)
      const newFeature = new Feature({
        geometry: newGeometry
      });
      newFeature.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 8,
            fill: new Fill({ color: getColor(deviceId) }),
            stroke: new Stroke({ color: '#fff', width: 3 })
          })
        })
      );
      newFeature.set('device_id', deviceId);
      newFeature.set('timestamp', data.timestamp);
      newFeature.set('isRealtime', true);
      
      realtimeFeaturesByDeviceRef.current[deviceId] = newFeature;
      realtimeMarkerSourceRef.current.addFeature(newFeature);
    }
  };

  useEffect(() => {

    async function fetchLocations() {
      const response = await fetch(DEVICES_API_URL);
      return await response.json();
    }

    async function initMap() {
      // Fetch total distance for each device from API
      const deviceIds = ['dev001', 'dev002', 'dev003', 'dev004', 'dev005'];
      const summaryResults: { device_id: string, total_distance_m: number }[] = [];
      for (const device_id of deviceIds) {
        try {
          const resp = await fetch(`http://localhost:8000/device-summary?device_id=${device_id}&date=${dateStr}`);
          const data = await resp.json();
          summaryResults.push({ device_id, total_distance_m: data.total_distance_m || 0 });
        } catch {
          summaryResults.push({ device_id, total_distance_m: 0 });
        }
      }
      setDistanceData(summaryResults);

      const locations = await fetchLocations();
      console.log('API locations:', locations);

      // Device type distribution for pie chart
      if (Array.isArray(locations)) {
        const counts: Record<string, number> = {};
        locations.forEach((loc: any) => {
          if (loc.device_id) counts[loc.device_id] = (counts[loc.device_id] || 0) + 1;
        });
        setDeviceCounts(Object.entries(counts).map(([device_id, count]) => ({ device_id, count })));
      }

      // Point markers - INITIAL LOADED DATA (will not change)
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
                    radius: 6,
                    fill: new Fill({ color: getColor(loc.device_id) }),
                    stroke: new Stroke({ color: '#fff', width: 1 })
                  })
                })
              );
              feature.set('device_id', loc.device_id);
              feature.set('timestamp', loc.timestamp);
              feature.set('isInitial', true);
              return feature;
            })
        : [];
      console.log('Initial Marker count:', features.length);

      // Create source and cluster for initial data
      initialMarkerSourceRef.current = new VectorSource({ features });
      const clusterSource = new Cluster({
        distance: 40,
        source: initialMarkerSourceRef.current
      });
      const clusterLayer = new VectorLayer({
        source: clusterSource,
        style: function (feature) {
          const features = feature.get('features');
          const size = features.length;
          if (size === 1) {
            // Single marker - use original style
            return features[0].getStyle();
          }
          // Find most common device_id in cluster
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

      // Create source for WebSocket real-time data (no clustering)
      realtimeMarkerSourceRef.current = new VectorSource();
      const realtimeLayer = new VectorLayer({
        source: realtimeMarkerSourceRef.current
      });
      const map = new Map({
        target: mapRef.current!,
        layers: [
          new TileLayer({ source: new OSM() }),
          clusterLayer,
          realtimeLayer
        ],
        view: new View({
          center: fromLonLat([32.86, 39.93]),
          zoom: 12
        })
      });
      // Auto-fit map to markers if present
      if (features.length > 0) {
        const extent = initialMarkerSourceRef.current!.getExtent();
        map.getView().fit(extent, { padding: [40, 40, 40, 40], maxZoom: 16, duration: 1000 });
      }
    }

    initMap();
  }, []);

  // Pie chart custom label function
  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.7;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#222" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={13} fontWeight={600}>
        {`${((percent * 100).toFixed(0))}%`}
      </text>
    );
  };

  // Bar chart custom label function
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
              {deviceCounts.map((entry) => (
                <Cell key={entry.device_id} fill={getColor(entry.device_id)} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `${v} units`} />
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
              {distanceData.map((entry) => (
                <Cell key={entry.device_id} fill={getColor(entry.device_id)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default App;
