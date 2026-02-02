-- Cassandra Timeseries Location Script
-- Keyspace oluşturma
CREATE KEYSPACE IF NOT EXISTS timeseries_location WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

-- Keyspace kullanma
USE timeseries_location;

-- Timeseries tabanlı location tablosu oluşturma
CREATE TABLE IF NOT EXISTS location_points (
    device_id text,
    ts timestamp,
    latitude double,
    longitude double,
    PRIMARY KEY (device_id, ts)
) WITH CLUSTERING ORDER BY (ts DESC);

-- Örnek veri ekleme
INSERT INTO location_points (device_id, ts, latitude, longitude) VALUES ('dev001', '2026-02-02T10:00:00', 41.015137, 28.979530);
INSERT INTO location_points (device_id, ts, latitude, longitude) VALUES ('dev001', '2026-02-02T10:05:00', 41.016137, 28.980530);
INSERT INTO location_points (device_id, ts, latitude, longitude) VALUES ('dev002', '2026-02-02T10:00:00', 40.712776, -74.005974);
