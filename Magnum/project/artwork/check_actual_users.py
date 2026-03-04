#!/usr/bin/env python3
"""
Check what's in Airtable for the actual users
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

# Password hashing
PW_SALT = 'MgnmArt_2026@#Salt!'
PASSWORD = "Admin@1234"

def hash_password_js_style(plaintext):
    data = (PW_SALT + plaintext).encode('utf-8')
    return hashlib.sha256(data).hexdigest()

ACTUAL_USERS = [
    "ai@tiuconsulting.com",
    "amit@tiuconsulting.com",
    "admin@tiuconsulting.com"
]

headers = {
    "Authorization": f"Bearer {PAT}"
}

expected_hash = hash_password_js_style(PASSWORD)

print(f"Expected password hash for '{PASSWORD}': {expected_hash}\n")

for email in ACTUAL_USERS:
    print(f"{'='*70}")
    print(f"Checking: {email}")
    print('='*70)

    # Query user
    filter_formula = f"{{username}}='{email}'"
    url = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE}"
    params = {"filterByFormula": filter_formula}

    response = requests.get(url, params=params, headers=headers)

    if response.status_code != 200:
        print(f"✗ API Error: {response.status_code}")
        continue

    data = response.json()
    records = data.get('records', [])

    if not records:
        print(f"✗ User NOT FOUND in Airtable")
    else:
        record = records[0]
        fields = record['fields']
        stored_hash = fields.get('password', '')
        status = fields.get('status', 'unknown')

        print(f"✓ User FOUND")
        print(f"  Status: {status}")
        print(f"  Stored hash: {stored_hash}")
        print(f"  Expected hash: {expected_hash}")

        if stored_hash == expected_hash:
            print(f"  Password match: ✓ YES - Should login successfully")
        else:
            print(f"  Password match: ✗ NO - Will fail to login")

    print()
