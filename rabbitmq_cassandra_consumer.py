import pika
import json
from cassandra.cluster import Cluster
from datetime import datetime
import requests
import asyncio

RABBITMQ_HOST = 'localhost'
RABBITMQ_QUEUE = 'location_data_queue'
WEBSOCKET_BROADCAST_URL = 'http://localhost:8000/send-location-update'

# Cassandra connection
cluster = Cluster(['127.0.0.1'])
session = cluster.connect('timeseries_location')

def insert_location(data):
    try:
        # Convert timestamp to Python date object
        date_obj = datetime.utcfromtimestamp(data['timestamp']).date()
        session.execute(
            "INSERT INTO location_points (date, device_id, latitude, longitude, ts) VALUES (%s, %s, %s, %s, %s)",
            (date_obj, data['device_id'], data['latitude'], data['longitude'], data['timestamp'])
        )
    except Exception as e:
        print(f"Cassandra insert error: {e}\nData: {data}")

def broadcast_location(data):
    try:
        message = {
            "type": "location_update",
            "device_id": data['device_id'],
            "timestamp": data['timestamp'],
            "latitude": data['latitude'],
            "longitude": data['longitude']
        }
        # Send location update to FastAPI via HTTP POST
        requests.post(
            WEBSOCKET_BROADCAST_URL,
            json=message,
            timeout=2
        )
    except Exception as e:
        print(f"Broadcasting error: {e}")

def callback(ch, method, properties, body):
    data = json.loads(body)
    insert_location(data)
    print(f"Inserted to Cassandra: {data}")
    
    # Broadcast via WebSocket
    broadcast_location(data)
    
    ch.basic_ack(delivery_tag=method.delivery_tag)

def main():
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    channel = connection.channel()
    channel.queue_declare(queue=RABBITMQ_QUEUE, durable=True)
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=RABBITMQ_QUEUE, on_message_callback=callback)
    print('Waiting for messages. To exit press CTRL+C')
    channel.start_consuming()

if __name__ == "__main__":
    main()
