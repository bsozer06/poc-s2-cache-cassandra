# Cassandra Timeseries Location PoC

Bu proje, Docker ile Cassandra kurulumunu, Python ile zaman serisi bazlı konum verisi simülasyonunu ve FastAPI ile REST API üzerinden veri sunumunu içeren bir PoC örneğidir.

## Kurulum

### 1. Cassandra'yı Docker ile Başlat
```
docker-compose up -d
```

### 2. Python Virtual Environment Oluştur
```
python -m venv venv
```

### 3. Ortamı Aktif Et
```
# Windows
.\venv\Scripts\activate
# Mac/Linux
source venv/bin/activate
```

### 4. Gerekli Paketleri Yükle
```
pip install cassandra-driver fastapi uvicorn
```

## Simülatör
Cassandra'ya sürekli konum verisi eklemek için:
```
python cassandra_simulator.py
```

## FastAPI ile REST API
API'yi başlatmak için:
```
python fastapi_cassandra_api.py
```

### API Kullanımı
Örnek sorgu:
```
http://localhost:8000/locations?device_id=dev001&start=2026-02-02T10:00:00&end=2026-02-02T11:00:00
```

## Cassandra'da Veri Sorgulama
Terminalde:
```
docker exec -it cassandra-timeseries cqlsh
USE timeseries_location;
SELECT * FROM location_points LIMIT 10;
```

## Notlar
- API ve simülatör kodları optimize edilmiştir.
- Cassandra sorgularında partition key ve clustering key kullanılır, ALLOW FILTERING yoktur.
- Geliştirme ve test için örnek cihazlar ve zaman aralıkları kullanılabilir.

---

Herhangi bir hata veya ek özellik için lütfen iletişime geçin.
