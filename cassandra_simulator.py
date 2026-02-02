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

while True:
    for device_id in devices:
        ts = datetime.utcnow()
        date_str = ts.strftime('%Y-%m-%d')
        latitude = round(random.uniform(40.0, 42.0), 6)
        longitude = round(random.uniform(28.0, 30.0), 6)
        query = f"INSERT INTO {TABLE} (date, device_id, ts, latitude, longitude) VALUES ('{date_str}', '{device_id}', '{ts}', {latitude}, {longitude});"
        try:
            session.execute(query)
            print(f"{device_id} -> {ts} -> {latitude}, {longitude}")
        except Exception as e:
            print(f"Hata: {e}")
    time.sleep(5)  # 5 saniyede bir veri ekle
