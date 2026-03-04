#!/usr/bin/env python3
"""
Check what password is stored in Airtable for the test user
"""

import requests
import hashlib
import json
from pathlib import Path

# Configuration from config.json

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
EMAIL = "ai@tiuconsulting.com"

# Password hashing (matching auth.js)
PW_SALT = 'MgnmArt_2026@#Salt!'
PASSWORD = "Admin@1234"

def hash_password_js_style(plaintext):
    """Hash password the same way as auth.js does it with SHA-256"""
    data = (PW_SALT + plaintext).encode('utf-8')
    return hashlib.sha256(data).hexdigest()

def main():
    # Query user from Airtable
    filter_formula = f"{{username}}='{EMAIL}'"
    url = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE}"
    params = {
        "filterByFormula": filter_formula
    }
    headers = {
        "Authorization": f"Bearer {PAT}"
    }

    print(f"Fetching user: {EMAIL}")
    print(f"API URL: {url}")
    print(f"Filter: {filter_formula}")

    response = requests.get(url, params=params, headers=headers)
    print(f"HTTP Status: {response.status_code}")

    if response.status_code != 200:
        print(f"Error: {response.text}")
        return

    data = response.json()
    records = data.get('records', [])

    if not records:
        print("✗ User not found in Airtable!")
        return

    user_record = records[0]
    print(f"\n✓ User found!")
    print(f"  Record ID: {user_record['id']}")
    print(f"  Fields: {json.dumps(user_record['fields'], indent=2)}")

    stored_password = user_record['fields'].get('password', '')
    status = user_record['fields'].get('status', 'unknown')

    print(f"\n  Status: {status}")
    print(f"  Stored password hash: {stored_password}")

    # Calculate what the hash SHOULD be
    expected_hash = hash_password_js_style(PASSWORD)
    print(f"\nPassword verification:")
    print(f"  Input password: {PASSWORD}")
    print(f"  Expected hash: {expected_hash}")
    print(f"  Stored hash:   {stored_password}")
    print(f"  Match: {stored_password == expected_hash}")

    if stored_password != expected_hash:
        print(f"\n✗ PASSWORD MISMATCH!")
        print(f"  The stored password in Airtable does not match the provided password.")
        print(f"\n  Options:")
        print(f"  1. Update the password in Airtable to the correct hash")
        print(f"  2. Use a different password that matches what's in Airtable")

        # Try to figure out what password was used to create the stored hash
        print(f"\n  Stored hash analysis:")
        print(f"  If you know the original password used to create the hash,")
        print(f"  you can verify it by hashing it again.")
    else:
        print(f"\n✓ PASSWORD MATCH! Login should work.")

if __name__ == "__main__":
    main()
