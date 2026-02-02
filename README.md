
# Cassandra Timeseries Location PoC

This project demonstrates a Proof of Concept for timeseries-based location data storage and querying using Cassandra (via Docker), a Python simulator, and a FastAPI REST API. A React + OpenLayers client is included for map visualization.

## Setup

### 1. Start Cassandra with Docker
```
docker-compose up -d
```

### 2. Create Python Virtual Environment
```
python -m venv venv
```

### 3. Activate Environment
```
# Windows
.\venv\Scripts\activate
# Mac/Linux
source venv/bin/activate
```

### 4. Install Required Packages
```
pip install cassandra-driver fastapi uvicorn
```

## Simulator
To continuously insert simulated location data into Cassandra:
```
python cassandra_simulator.py
```

## FastAPI REST API
To start the API server:
```
python fastapi_cassandra_api.py
```

### API Endpoints

- `GET /locations?date=2026-02-02&device_id=dev001&start=2026-02-02T10:00:00&end=2026-02-02T11:00:00`  
	Returns all location points for a specific device and date in the given time range.

- `GET /all-locations?date=2026-02-02&start=2026-02-02T00:00:00&end=2026-02-02T23:59:59`  
	Returns all location points for all devices for a specific date and time range.

- `GET /devices-in-range?date=2026-02-02&start=2026-02-02T00:00:00&end=2026-02-02T23:59:59`  
	Returns all unique device IDs that have data in the given date and time range.

#### Error Handling
- All endpoints return error details in JSON if a query fails.

#### CORS
- CORS is enabled for all origins for development. Adjust `allow_origins` in FastAPI for production.

## Querying Cassandra
In terminal:
```
docker exec -it cassandra-timeseries cqlsh
USE timeseries_location;
SELECT * FROM location_points LIMIT 10;
```

## Notes & Improvements
- Partition key: (date, device_id), clustering key: ts (timestamp)
- All endpoints are optimized to use partition key (date, device_id) and do not require ALLOW FILTERING for efficient queries.
- Python-side deduplication is used for device listing
- React client fetches and displays data on a map, and can list available devices
- Error handling and logging improved for easier debugging
- CORS and API structure updated for modern frontend compatibility

---

For issues or feature requests, please contact the maintainer.
