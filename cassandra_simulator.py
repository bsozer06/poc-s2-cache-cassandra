import time
import random
from datetime import datetime
from cassandra.cluster import Cluster

# Cassandra bağlantı bilgileri
# CASSANDRA_HOST = 'localhost'
CASSANDRA_HOST = '127.0.0.1'
CASSANDRA_PORT = 9042
KEYSPACE = 'timeseries_location'
TABLE = 'location_points'

# Bağlantı
cluster = Cluster([CASSANDRA_HOST], port=CASSANDRA_PORT)
session = cluster.connect(KEYSPACE)

# Simüle edilecek cihazlar
devices = ['dev001', 'dev002', 'dev003', 'dev004', 'dev005']

last_positions = {}
LAT_MIN, LAT_MAX = 39.85, 39.98  # Ankara merkezine yakın dar bbox
LON_MIN, LON_MAX = 32.75, 32.95
STEP = 0.001  # Maksimum hareket mesafesi (derece cinsinden)

while True:
    for device_id in devices:
        ts = datetime.utcnow()
        date_str = ts.strftime('%Y-%m-%d')
        # Eğer cihazın önceki konumu yoksa, random başlat
        if device_id not in last_positions:
            latitude = round(random.uniform(LAT_MIN, LAT_MAX), 6)
            longitude = round(random.uniform(LON_MIN, LON_MAX), 6)
        else:
            prev_lat, prev_lon = last_positions[device_id]
            # Küçük bir random adım uygula
            latitude = round(min(max(prev_lat + random.uniform(-STEP, STEP), LAT_MIN), LAT_MAX), 6)
            longitude = round(min(max(prev_lon + random.uniform(-STEP, STEP), LON_MIN), LON_MAX), 6)
        last_positions[device_id] = (latitude, longitude)
        query = f"INSERT INTO {TABLE} (date, device_id, ts, latitude, longitude) VALUES ('{date_str}', '{device_id}', '{ts}', {latitude}, {longitude});"
        try:
            session.execute(query)
            print(f"{device_id} -> {ts} -> {latitude}, {longitude}")
        except Exception as e:
            print(f"Hata: {e}")
    time.sleep(5)  # 5 saniyede bir veri ekle
