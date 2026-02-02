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

INSERT INTO location_points (date, device_id, ts, latitude, longitude) VALUES ('2026-02-02', 'dev001', '2026-02-02T10:00:00', 39.965210, 32.779456);
INSERT INTO location_points (date, device_id, ts, latitude, longitude) VALUES ('2026-02-02', 'dev002', '2026-02-02T10:00:00', 39.893581, 32.8805634);
INSERT INTO location_points (date, device_id, ts, latitude, longitude) VALUES ('2026-02-02', 'dev003', '2026-02-02T10:00:00', 40.12367368006636, 33.087289442176555);
INSERT INTO location_points (date, device_id, ts, latitude, longitude) VALUES ('2026-02-02', 'dev004', '2026-02-02T10:00:00', 40.33763976378671, 32.35409999172645);
INSERT INTO location_points (date, device_id, ts, latitude, longitude) VALUES ('2026-02-02', 'dev005', '2026-02-02T10:00:00', 39.367178454182636, 32.45134270489608);
