CREATE KEYSPACE IF NOT EXISTS timeseries_location WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

-- Keyspace kullanma
USE timeseries_location;

CREATE TABLE IF NOT EXISTS location_points (
    date text,         
    device_id text,
    ts timestamp,
    latitude double,
    longitude double,
    PRIMARY KEY ((date, device_id), ts)
) WITH CLUSTERING ORDER BY (ts DESC);

-- Tabloyu temizle
TRUNCATE location_points;

SELECT * from location_points LIMIT 10;