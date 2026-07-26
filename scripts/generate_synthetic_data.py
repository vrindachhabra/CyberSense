import pandas as pd
import numpy as nph
from faker import Faker
import random
import uuid
from datetime import datetime, timedelta
import os

fake = Faker()

# Configuration
NUM_LOGS = 10000
NUM_ENTITIES = 1000
START_DATE = datetime.now() - timedelta(days=30)

# Constants for Generation
OS_CHOICES = ["Windows 10", "Windows 11", "macOS", "Linux", "iOS", "Android"]
BROWSER_CHOICES = ["Chrome", "Firefox", "Safari", "Edge"]
AUTH_METHODS = ["Password", "MFA", "OAuth", "SSO"]
HTTP_METHODS = ["GET", "POST", "PUT", "DELETE"]
NORMAL_RESOURCES = ["/api/dashboard", "/api/profile", "/api/data/view", "/api/settings", "/login"]
SENSITIVE_RESOURCES = ["/api/admin/db", "/api/secrets", "/internal/infrastructure", "/api/export/all"]

def generate_base_entities(num_entities):
    entities = {}
    for _ in range(num_entities):
        e_id = str(uuid.uuid4())
        entities[e_id] = {
            "entity_id": e_id,
            "entity_type": random.choice(["USER", "USER", "USER", "SERVICE_ACCOUNT"]),
            "primary_ip": fake.ipv4(),
            "geo_location": fake.city() + ", " + fake.country(),
            "device_fingerprint": str(uuid.uuid4()),
            "os": random.choice(OS_CHOICES),
            "browser": random.choice(BROWSER_CHOICES),
            "auth_method": random.choice(AUTH_METHODS)
        }
    return entities

def generate_normal_event(entity, timestamp):
    return {
        "entity_id": entity["entity_id"],
        "entity_type": entity["entity_type"],
        "timestamp": timestamp.isoformat(),
        "ip": entity["primary_ip"] if random.random() > 0.1 else fake.ipv4(),
        "geo_location": entity["geo_location"] if random.random() > 0.1 else fake.city() + ", " + fake.country(),
        "device_fingerprint": entity["device_fingerprint"] if random.random() > 0.05 else str(uuid.uuid4()),
        "os": entity["os"],
        "browser": entity["browser"],
        "resource_accessed": random.choice(NORMAL_RESOURCES),
        "http_method": np.random.choice(HTTP_METHODS, p=[0.7, 0.2, 0.05, 0.05]),
        "authentication_method": entity["auth_method"],
        "session_duration": max(1, int(np.random.normal(30, 10))),
        "command_sequence": f"cmd_{random.randint(1, 10)} -> cmd_{random.randint(11, 20)}",
        "label": 0,
        "anomaly_type": "None"
    }

print("Generating Base Entities...")
entities = generate_base_entities(NUM_ENTITIES)
entity_keys = list(entities.keys())

events = []

print(f"Generating {NUM_LOGS} normal logs...")
current_time = START_DATE
while len(events) < NUM_LOGS:
    # Progress time slightly
    current_time += timedelta(seconds=random.randint(1, 60))
    entity = entities[random.choice(entity_keys)]
    
    # Simulate business hours (more logs during day)
    if 9 <= current_time.hour <= 17 or random.random() > 0.7:
        events.append(generate_normal_event(entity, current_time))

print("Injecting Anomalies...")

# 1. Brute Force (High volume failed auth from single IP)
print(" - Injecting Brute Force...")
brute_force_target = entities[random.choice(entity_keys)]
bf_ip = fake.ipv4()
bf_time = START_DATE + timedelta(days=random.randint(1, 25))
for _ in range(50):
    bf_time += timedelta(seconds=2)
    events.append({
        **generate_normal_event(brute_force_target, bf_time),
        "ip": bf_ip,
        "resource_accessed": "/login",
        "http_method": "POST",
        "label": 1,
        "anomaly_type": "Brute Force"
    })

# 2. Impossible Travel (Two distant locations in short time)
print(" - Injecting Impossible Travel...")
it_target = entities[random.choice(entity_keys)]
it_time = START_DATE + timedelta(days=random.randint(1, 25))
events.append({
    **generate_normal_event(it_target, it_time),
    "geo_location": "New York, USA",
    "ip": fake.ipv4(),
    "label": 1,
    "anomaly_type": "Impossible Travel"
})
events.append({
    **generate_normal_event(it_target, it_time + timedelta(minutes=15)),
    "geo_location": "Tokyo, Japan",
    "ip": fake.ipv4(),
    "label": 1,
    "anomaly_type": "Impossible Travel"
})

# 3. Credential Stuffing (Many entities, few IPs)
print(" - Injecting Credential Stuffing...")
stuffing_ips = [fake.ipv4() for _ in range(3)]
stuffing_time = START_DATE + timedelta(days=random.randint(1, 25))
for _ in range(200):
    stuffing_time += timedelta(seconds=1)
    target = entities[random.choice(entity_keys)]
    events.append({
        **generate_normal_event(target, stuffing_time),
        "ip": random.choice(stuffing_ips),
        "resource_accessed": "/login",
        "http_method": "POST",
        "label": 1,
        "anomaly_type": "Credential Stuffing"
    })

# 4. Device Spoofing
print(" - Injecting Device Spoofing...")
ds_target = entities[random.choice(entity_keys)]
ds_time = START_DATE + timedelta(days=random.randint(1, 25))
events.append({
    **generate_normal_event(ds_target, ds_time),
    "device_fingerprint": "SPOOFED_" + str(uuid.uuid4()),
    "os": "Unknown",
    "browser": "Tor Browser",
    "label": 1,
    "anomaly_type": "Device Spoofing"
})

# 5. Lateral Movement
print(" - Injecting Lateral Movement...")
lm_target = entities[random.choice(entity_keys)]
lm_time = START_DATE + timedelta(days=random.randint(1, 25))
events.append({
    **generate_normal_event(lm_target, lm_time),
    "resource_accessed": random.choice(SENSITIVE_RESOURCES),
    "command_sequence": "ls -> cat /etc/passwd -> ssh",
    "label": 1,
    "anomaly_type": "Lateral Movement"
})

# 6. Low and Slow Exfiltration
print(" - Injecting Low and Slow Exfiltration...")
ls_target = entities[random.choice(entity_keys)]
ls_time = START_DATE + timedelta(days=2)
for _ in range(40):
    ls_time += timedelta(hours=6)
    events.append({
        **generate_normal_event(ls_target, ls_time),
        "resource_accessed": "/api/export/all",
        "http_method": "GET",
        "label": 1,
        "anomaly_type": "Low and Slow Exfiltration"
    })

# 7. Insider Drift
print(" - Injecting Insider Drift...")
id_target = entities[random.choice(entity_keys)]
id_time = START_DATE + timedelta(days=15)
for i in range(20):
    id_time += timedelta(hours=12)
    # Becomes more anomalous over time
    res = random.choice(SENSITIVE_RESOURCES) if i > 10 else random.choice(NORMAL_RESOURCES)
    events.append({
        **generate_normal_event(id_target, id_time),
        "resource_accessed": res,
        "label": 1 if i > 10 else 0,
        "anomaly_type": "Insider Drift" if i > 10 else "None"
    })

print("Sorting by timestamp and creating DataFrame...")
df = pd.DataFrame(events)
df['timestamp'] = pd.to_datetime(df['timestamp'])
df = df.sort_values(by='timestamp')

# Reorder columns to match requested fields
cols = ['entity_id', 'entity_type', 'timestamp', 'ip', 'geo_location', 
        'device_fingerprint', 'os', 'browser', 'resource_accessed', 
        'http_method', 'authentication_method', 'session_duration', 
        'command_sequence', 'label', 'anomaly_type']

df = df[cols]

os.makedirs('dataset', exist_ok=True)
output_path = 'dataset/access_logs.csv'
df.to_csv(output_path, index=False)

print(f"Dataset generated successfully at {output_path} with {len(df)} rows.")
print("Anomaly Distribution:")
print(df['anomaly_type'].value_counts())
