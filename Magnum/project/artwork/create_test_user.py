#!/usr/bin/env python3
"""
Create the test user ai@tiuconsulting.com with password Admin@1234
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

# Test credentials
EMAIL = "ai@tiuconsulting.com"
PASSWORD = "Admin@1234"

# Password hashing (matching auth.js)
PW_SALT = 'MgnmArt_2026@#Salt!'

def hash_password_js_style(plaintext):
    """Hash password the same way as auth.js does it with SHA-256"""
    data = (PW_SALT + plaintext).encode('utf-8')
    return hashlib.sha256(data).hexdigest()

def main():
    # Calculate the password hash
    password_hash = hash_password_js_style(PASSWORD)
    print(f"Creating user: {EMAIL}")
    print(f"Password: {PASSWORD}")
    print(f"Password hash: {password_hash}")

    # Create the user record in Airtable
    url = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE}"
    headers = {
        "Authorization": f"Bearer {PAT}",
        "Content-Type": "application/json"
    }

    data = {
        "records": [
            {
                "fields": {
                    "username": EMAIL,
                    "password": password_hash,
                    "status": "active"
                }
            }
        ]
    }

    print(f"\nSending request to Airtable...")
    response = requests.post(url, headers=headers, json=data)
    print(f"HTTP Status: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        print(f"✓ User created successfully!")
        print(f"Response: {json.dumps(result, indent=2)}")
    else:
        print(f"✗ Error creating user!")
        print(f"Response: {response.text}")

if __name__ == "__main__":
    main()
