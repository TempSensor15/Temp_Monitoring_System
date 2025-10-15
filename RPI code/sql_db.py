import time
import adafruit_dht
import board
import sqlite3
from datetime import datetime
import os

# --- Config ---
DHT_PIN = board.D4
DB_PATH = os.path.join(os.path.dirname(__file__), "sensor_data.db")

# --- Setup: Create DB if it doesn't exist ---
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            temperature REAL,
            humidity REAL
        )
    ''')
    conn.commit()
    conn.close()

# --- Insert new row into DB ---
def log_to_db(temperature, humidity):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cur.execute('''
        INSERT INTO readings (timestamp, temperature, humidity)
        VALUES (?, ?, ?)
    ''', (now, temperature, humidity))
    conn.commit()
    conn.close()

# --- Main loop ---
def main():
    dht_device = adafruit_dht.DHT11(DHT_PIN)
    init_db()
    while True:
        try:
            temperature = dht_device.temperature
            humidity = dht_device.humidity

            # Filter out invalid readings
            if (
                temperature is not None and humidity is not None
                and temperature >= 5 and humidity > 0
            ):
                print(f"[{datetime.now()}] Temp: {temperature}C | Humidity: {humidity}%")
                log_to_db(temperature, humidity)
            else:
                print(f"[{datetime.now()}] Skipped invalid reading - Temp: {temperature}, Humidity: {humidity}")
        except Exception as e:
            print(f"[{datetime.now()}] DHT11 read error: {e}")
        time.sleep(15)

if __name__ == "__main__":
    main()
