
from math import radians, cos, sin, sqrt, atan2
from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from cassandra.cluster import Cluster
from datetime import datetime
from typing import List, Optional, Set
import uvicorn

app = FastAPI()

# CORS configuration: allow requests from React client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CASSANDRA_HOST = '127.0.0.1'
CASSANDRA_PORT = 9042
KEYSPACE = 'timeseries_location'
TABLE = 'location_points'

cluster = Cluster([CASSANDRA_HOST], port=CASSANDRA_PORT)
session = cluster.connect(KEYSPACE)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error broadcasting message: {e}")

manager = ConnectionManager()

@app.websocket("/ws/locations")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive by waiting for messages
            data = await websocket.receive_text()
            # Can receive commands from client if needed
            print(f"Received from client: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("Client disconnected")

@app.post("/send-location-update")
async def send_location_update(data: dict):
    """Receive location updates from RabbitMQ consumer and broadcast via WebSocket"""
    message = {
        "type": "location_update",
        "device_id": data.get('device_id'),
        "timestamp": data.get('timestamp'),
        "latitude": data.get('latitude'),
        "longitude": data.get('longitude')
    }
    await manager.broadcast(message)
    return {"status": "broadcasted"}

@app.get("/devices-in-range")
def get_devices_in_range(
    date: str = Query(..., description="Date (YYYY-MM-DD)", example="2026-02-02"),
    start: str = Query(..., description="Start time (ISO format)", example="2026-02-02T00:00:00"),
    end: str = Query(..., description="End time (ISO format)", example="2026-02-02T23:59:59")
):
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
        # Use static device_id list (as in simulator)
        device_ids = ['dev001', 'dev002', 'dev003', 'dev004', 'dev005']
        results = []
        for device_id in device_ids:
            data_query = f"""
                SELECT device_id, ts, latitude, longitude FROM {TABLE}
                WHERE date = %s AND device_id = %s AND ts >= %s AND ts <= %s
            """
            rows = session.execute(data_query, (date, device_id, start_dt, end_dt))
            for row in rows:
                results.append({
                    "device_id": row.device_id,
                    "timestamp": row.ts.isoformat(),
                    "latitude": row.latitude,
                    "longitude": row.longitude
                })
        return results
    except Exception as e:
        return {"error": str(e)}


@app.get("/device-summary")
def device_summary(
    device_id: str = Query(..., description="Cihaz ID"),
    date: str = Query(..., description="Gün (YYYY-MM-DD)")
):
    try:
        query = f"""
            SELECT ts, latitude, longitude FROM {TABLE}
            WHERE date = %s AND device_id = %s
            ORDER BY ts ASC
        """
        rows = list(session.execute(query, (date, device_id)))
        if not rows:
            return {"device_id": device_id, "date": date, "count": 0, "first": None, "last": None, "total_distance_m": 0}
        first = rows[0]
        last = rows[-1]
        total_distance = 0.0
        for i in range(1, len(rows)):
            total_distance += haversine(
                rows[i-1].latitude, rows[i-1].longitude,
                rows[i].latitude, rows[i].longitude
            )
        return {
            "device_id": device_id,
            "date": date,
            "count": len(rows),
            "first": {
                "timestamp": first.ts.isoformat(),
                "latitude": first.latitude,
                "longitude": first.longitude
            },
            "last": {
                "timestamp": last.ts.isoformat(),
                "latitude": last.latitude,
                "longitude": last.longitude
            },
            "total_distance_m": round(total_distance, 2)
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/locations")
def get_locations(
    date: str = Query(..., description="Gün (YYYY-MM-DD)", example="2026-02-02"),
    device_id: str = Query(..., description="Cihaz ID"),
    start: str = Query(..., description="Başlangıç zamanı (ISO format)", example="2026-02-02T10:00:00"),
    end: str = Query(..., description="Bitiş zamanı (ISO format)", example="2026-02-02T11:00:00")
):
    start_dt = datetime.fromisoformat(start)
    end_dt = datetime.fromisoformat(end)
    query = f"""
        SELECT device_id, ts, latitude, longitude FROM {TABLE}
        WHERE date = %s AND device_id = %s AND ts >= %s AND ts <= %s
    """
    rows = session.execute(query, (date, device_id, start_dt, end_dt))
    return [
        {
            "device_id": row.device_id,
            "timestamp": row.ts.isoformat(),
            "latitude": row.latitude,
            "longitude": row.longitude
        }
        for row in rows
    ]


@app.get("/all-locations")
def get_all_locations(
    date: str = Query(..., description="Gün (YYYY-MM-DD)", example="2026-02-02"),
    start: str = Query(..., description="Başlangıç zamanı (ISO format)", example="2026-02-02T00:00:00"),
    end: str = Query(..., description="Bitiş zamanı (ISO format)", example="2026-02-02T23:59:59")
):
    start_dt = datetime.fromisoformat(start)
    end_dt = datetime.fromisoformat(end)
    query = f'''
        SELECT device_id, ts, latitude, longitude FROM {TABLE}
        WHERE date = %s AND ts >= %s AND ts <= %s
    '''
    rows = session.execute(query, (date, start_dt, end_dt))
    return [
        {
            "device_id": row.device_id,
            "timestamp": row.ts.isoformat(),
            "latitude": row.latitude,
            "longitude": row.longitude
        }
        for row in rows
    ]

# Haversine formula for distance in meters
def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # Earth radius in meters
    phi1 = radians(lat1)
    phi2 = radians(lat2)
    dphi = radians(lat2 - lat1)
    dlambda = radians(lon2 - lon1)
    a = sin(dphi/2)**2 + cos(phi1)*cos(phi2)*sin(dlambda/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
