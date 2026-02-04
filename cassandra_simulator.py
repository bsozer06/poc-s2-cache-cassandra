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

import random
import time
import pika
import json

# RabbitMQ bağlantısı
RABBITMQ_HOST = 'localhost'
RABBITMQ_QUEUE = 'location_data_queue'

def generate_location_data(device_id):
    # Ankara sınırları yaklaşık: 39.7 - 40.1 enlem, 32.5 - 33.0 boylam
    return {
        'device_id': device_id,
        'timestamp': int(time.time()),
        'latitude': random.uniform(39.7, 40.1),
        'longitude': random.uniform(32.5, 33.0)
    }

def send_to_rabbitmq(data):
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    channel = connection.channel()
    channel.queue_declare(queue=RABBITMQ_QUEUE, durable=True)
    channel.basic_publish(
        exchange='',
        routing_key=RABBITMQ_QUEUE,
        body=json.dumps(data),
        properties=pika.BasicProperties(delivery_mode=2)  # make message persistent
    )
    connection.close()

if __name__ == "__main__":
    device_ids = ['dev001', 'dev002', 'dev003', 'dev004', 'dev005']
    while True:
        for device_id in device_ids:
            data = generate_location_data(device_id)
            send_to_rabbitmq(data)
            print(f"Sent to RabbitMQ: {data}")
        time.sleep(1)
