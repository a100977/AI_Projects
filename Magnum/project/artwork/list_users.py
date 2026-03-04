#!/usr/bin/env python3
"""
List all users in the magnum_user table
"""

import requests
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

def main():
    url = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE}"
    headers = {
        "Authorization": f"Bearer {PAT}"
    }

    print(f"Fetching all users from magnum_user table...")
    response = requests.get(url, headers=headers)
    print(f"HTTP Status: {response.status_code}")

    if response.status_code != 200:
        print(f"Error: {response.text}")
        return

    data = response.json()
    records = data.get('records', [])

    print(f"\nTotal users: {len(records)}\n")

    if not records:
        print("No users found in the table!")
        return

    for i, record in enumerate(records, 1):
        fields = record['fields']
        username = fields.get('username', 'N/A')
        status = fields.get('status', 'N/A')
        password = fields.get('password', 'N/A')
        password_display = f"{password[:20]}..." if password and len(password) > 20 else password

        print(f"{i}. {username}")
        print(f"   Status: {status}")
        print(f"   Password hash: {password_display}")
        print()

if __name__ == "__main__":
    main()
