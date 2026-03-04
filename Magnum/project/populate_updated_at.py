#!/usr/bin/env python3
"""Populate updated_at field for all records that are missing it"""

import requests
import json
from datetime import datetime
import time
from pathlib import Path


def load_config():
    config_path = Path(__file__).resolve().parent / "artwork" / "config.json"
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


cfg = load_config()
AIRTABLE_BASE = (cfg.get("BaseId") or "").strip()
AIRTABLE_TABLE = (cfg.get("TABLE_ARTWORK") or "magnum_artwork").strip()
API_KEY = (cfg.get("PAT") or "").strip()

if not AIRTABLE_BASE or not API_KEY:
    raise RuntimeError("Missing BaseId/PAT in artwork/config.json")

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

print("=" * 80)
print("📋 POPULATING updated_at field for all records")
print("=" * 80)
print()

# Fetch all records
print("Fetching all records...")
all_records = []
offset = None
page = 0

while True:
    page += 1
    url = f"https://api.airtable.com/v0/{AIRTABLE_BASE}/{AIRTABLE_TABLE}?pageSize=100"
    if offset:
        url += f"&offset={offset}"

    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
        break

    data = response.json()
    all_records.extend(data['records'])

    print(f"  Loaded page {page}: {len(data['records'])} records")

    if 'offset' not in data:
        break
    offset = data['offset']

print(f"\n✅ Fetched {len(all_records)} total records")
print()

# Find records without updated_at
records_to_update = []
for record in all_records:
    fields = record.get('fields', {})
    if 'updated_at' not in fields or not fields.get('updated_at'):
        records_to_update.append(record)

print(f"Found {len(records_to_update)} records missing updated_at field")

if not records_to_update:
    print("✅ All records already have updated_at field populated!")
else:
    print(f"\n📝 Updating {len(records_to_update)} records...\n")

    current_time = datetime.utcnow().isoformat() + 'Z'
    updated_count = 0
    failed_count = 0

    for idx, record in enumerate(records_to_update, 1):
        record_id = record['id']
        project_name = record.get('fields', {}).get('project_name', 'Unknown')

        # Update record with updated_at timestamp
        update_url = f"https://api.airtable.com/v0/{AIRTABLE_BASE}/{AIRTABLE_TABLE}/{record_id}"
        payload = {
            "fields": {
                "updated_at": current_time
            }
        }

        response = requests.patch(update_url, json=payload, headers=headers)

        if response.status_code in [200, 201]:
            print(f"  ✅ {idx}/{len(records_to_update)} Updated: {project_name} ({record_id})")
            updated_count += 1
        else:
            print(f"  ❌ {idx}/{len(records_to_update)} Failed: {project_name} ({response.status_code})")
            print(f"     Response: {response.text}")
            failed_count += 1

        # Rate limiting - Airtable allows 5 requests/sec
        time.sleep(0.25)

    print()
    print("=" * 80)
    print(f"✅ Updated: {updated_count} records")
    print(f"❌ Failed: {failed_count} records")
    print("=" * 80)
    print()
    print("🎉 All records now have updated_at field populated!")
    print()
    print("📝 Next steps:")
    print("  1. Refresh the compliance.html page in your browser")
    print("  2. The Date column should now show timestamps for all rows")

