#!/usr/bin/env python3
"""
Update all users to have the same test password: Admin@1234
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

# Password hashing (matching auth.js)
PW_SALT = 'MgnmArt_2026@#Salt!'
PASSWORD = "Admin@1234"

def hash_password_js_style(plaintext):
    """Hash password the same way as auth.js does it with SHA-256"""
    data = (PW_SALT + plaintext).encode('utf-8')
    return hashlib.sha256(data).hexdigest()

def main():
    # Calculate the password hash
    password_hash = hash_password_js_style(PASSWORD)
    print(f"Password: {PASSWORD}")
    print(f"Password hash: {password_hash}\n")

    # First, get all users
    url = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE}"
    headers = {
        "Authorization": f"Bearer {PAT}"
    }

    print("Fetching all users...")
    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        print(f"Error fetching users: {response.text}")
        return

    data = response.json()
    records = data.get('records', [])

    print(f"Found {len(records)} users\n")

    # Update each user
    for record in records:
        user_id = record['id']
        email = record['fields'].get('username', 'Unknown')

        # Update the user with the new password hash
        update_url = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE}/{user_id}"
        update_headers = {
            "Authorization": f"Bearer {PAT}",
            "Content-Type": "application/json"
        }

        update_data = {
            "fields": {
                "password": password_hash
            }
        }

        print(f"Updating {email}...", end=" ")
        update_response = requests.patch(update_url, headers=update_headers, json=update_data)

        if update_response.status_code == 200:
            print("✓ Success")
        else:
            print(f"✗ Error: {update_response.status_code}")

    print(f"\n✓ All users updated!")
    print(f"\nYou can now login with ANY of these users using password: {PASSWORD}")
    print(f"\nTest users:")
    for record in records:
        email = record['fields'].get('username', 'Unknown')
        print(f"  - {email} / {PASSWORD}")

if __name__ == "__main__":
    main()
