#!/usr/bin/env python3
"""
Create the missing users in Airtable
"""

import requests
import hashlib
import json
from pathlib import Path


def load_config():
    config_path = Path(__file__).resolve().parent / "config.json"
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


cfg = load_config()
BASE_ID = (cfg.get("BaseId") or "").strip()
PAT = (cfg.get("PAT") or "").strip()
TABLE = (cfg.get("TABLE_USERS") or "magnum_user").strip()

if not BASE_ID or not PAT:
    raise RuntimeError("Missing BaseId/PAT in artwork/config.json")

PW_SALT = 'MgnmArt_2026@#Salt!'
PASSWORD = "Admin@1234"

def hash_password_js_style(plaintext):
    data = (PW_SALT + plaintext).encode('utf-8')
    return hashlib.sha256(data).hexdigest()

# Users to create
USERS_TO_CREATE = [
    {"first_name": "Amit", "last_name": "", "username": "amit@tiuconsulting.com"},
    {"first_name": "Admin", "last_name": "", "username": "admin@tiuconsulting.com"}
]

password_hash = hash_password_js_style(PASSWORD)

headers = {
    "Authorization": f"Bearer {PAT}",
    "Content-Type": "application/json"
}

print(f"Creating {len(USERS_TO_CREATE)} users...")
print(f"Password: {PASSWORD}")
print(f"Password hash: {password_hash}\n")

for user_info in USERS_TO_CREATE:
    email = user_info['username']
    print(f"Creating {email}...", end=" ")

    data = {
        "records": [
            {
                "fields": {
                    "first_name": user_info['first_name'],
                    "last_name": user_info['last_name'],
                    "username": email,
                    "password": password_hash,
                    "status": "active"
                }
            }
        ]
    }

    url = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE}"
    response = requests.post(url, headers=headers, json=data)

    if response.status_code == 200:
        print("✓ Success")
        result = response.json()
        record_id = result['records'][0]['id']
        print(f"  Record ID: {record_id}")
    else:
        print(f"✗ Failed: {response.status_code}")
        print(f"  Error: {response.text}")

print(f"\n✓ All users created!")
