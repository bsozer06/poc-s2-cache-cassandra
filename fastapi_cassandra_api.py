from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from cassandra.cluster import Cluster
from datetime import datetime
from typing import List, Optional
import uvicorn

app = FastAPI()

# CORS ayarı: React client'tan gelen istekler için izin ver
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

@app.get("/devices-in-range")
def get_devices_in_range(
    date: str = Query(..., description="Gün (YYYY-MM-DD)", example="2026-02-02"),
    start: str = Query(..., description="Başlangıç zamanı (ISO format)", example="2026-02-02T00:00:00"),
    end: str = Query(..., description="Bitiş zamanı (ISO format)", example="2026-02-02T23:59:59")
):
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
        query = f"""
            SELECT device_id, ts, latitude, longitude FROM {TABLE}
            WHERE date = %s AND ts >= %s AND ts <= %s ALLOW FILTERING
        """
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


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
