-- Cassandra Timeseries Location Script
-- Keyspace oluşturma
CREATE KEYSPACE IF NOT EXISTS timeseries_location WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

-- Keyspace kullanma
USE timeseries_location;

-- Timeseries tabanlı location tablosu oluşturma

CREATE TABLE IF NOT EXISTS location_points (
    date text,         
    device_id text,
    ts timestamp,
    latitude double,
    longitude double,
    PRIMARY KEY ((date, device_id), ts)
) WITH CLUSTERING ORDER BY (ts DESC);

INSERT INTO location_points (date, device_id, ts, latitude, longitude) VALUES ('2026-02-02', 'dev001', '2026-02-02T10:00:00', 41.015137, 28.979530);
INSERT INTO location_points (date, device_id, ts, latitude, longitude) VALUES ('2026-02-02', 'dev002', '2026-02-02T10:05:00', 41.016137, 28.980530);
INSERT INTO location_points (date, device_id, ts, latitude, longitude) VALUES ('2026-02-02', 'dev003', '2026-02-02T10:00:00', 40.712776, -74.005974);
