#!/usr/bin/env python3
"""Debug script to check if updated_at field is being returned from Airtable API"""

import requests
import json
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

print("=" * 80)
print("🔍 DEBUGGING: updated_at field retrieval from Airtable")
print("=" * 80)
print()

# Test 1: Check if field exists in schema
print("TEST 1: Verify field exists in schema")
print("-" * 80)
schema_url = f"https://api.airtable.com/v0/meta/bases/{AIRTABLE_BASE}/tables"
headers = {"Authorization": f"Bearer {API_KEY}"}

response = requests.get(schema_url, headers=headers)
if response.status_code == 200:
    tables = response.json()['tables']
    table = next(
        (t for t in tables if t['id'] == AIRTABLE_TABLE or t['name'] == AIRTABLE_TABLE),
        None
    )
    if table:
        field = next((f for f in table['fields'] if f['name'] == 'updated_at'), None)
        if field:
            print(f"✅ Field EXISTS: {field['name']}")
            print(f"   Type: {field['type']}")
            print(f"   ID: {field['id']}")
        else:
            print("❌ Field NOT found in schema")
else:
    print(f"❌ Error: {response.status_code}")

print()

# Test 2: Fetch a single record without field filtering
print("TEST 2: Fetch record WITHOUT field filtering")
print("-" * 80)
url = f"https://api.airtable.com/v0/{AIRTABLE_BASE}/{AIRTABLE_TABLE}?pageSize=1&sort[0][field]=created_at&sort[0][direction]=desc"
response = requests.get(url, headers=headers)

if response.status_code == 200:
    data = response.json()
    if data['records']:
        record = data['records'][0]
        print(f"Record ID: {record['id']}")
        print(f"Fields returned: {len(record['fields'])} fields")

        if 'updated_at' in record['fields']:
            print(f"✅ updated_at field IS present")
            print(f"   Value: {record['fields']['updated_at']}")
        else:
            print(f"❌ updated_at field NOT present in response")
            print(f"   Available fields:")
            for key in sorted(record['fields'].keys()):
                val = str(record['fields'][key])[:50]
                if 'date' in key.lower() or 'time' in key.lower():
                    print(f"      🕐 {key}: {val}")
                else:
                    print(f"      • {key}: {val}")
else:
    print(f"❌ Error: {response.status_code}")

print()

# Test 3: Fetch with explicit field filtering
print("TEST 3: Fetch record WITH explicit field list")
print("-" * 80)
url = f"https://api.airtable.com/v0/{AIRTABLE_BASE}/{AIRTABLE_TABLE}?fields[]=updated_at&fields[]=created_at&fields[]=project_name&pageSize=1"
response = requests.get(url, headers=headers)

if response.status_code == 200:
    data = response.json()
    if data['records']:
        record = data['records'][0]
        print(f"Record ID: {record['id']}")
        print(f"Fields returned: {len(record['fields'])} fields")

        for key, val in record['fields'].items():
            print(f"  • {key}: {val}")
else:
    print(f"❌ Error: {response.status_code}")

print()

# Test 4: Check field permissions
print("TEST 4: Check if field is read-accessible")
print("-" * 80)
print("If tests above passed, the field is readable.")
print("If test 2 shows the field but test 3 fails, there may be a permissions issue.")
print()

# Test 5: Show what the frontend is doing
print("TEST 5: Simulate frontend code")
print("-" * 80)

def formatDate(dateStr):
    """Simulate the formatDate function from frontend"""
    if not dateStr:
        return 'N/A'
    try:
        from datetime import datetime
        # Parse ISO format
        date = datetime.fromisoformat(dateStr.replace('Z', '+00:00'))
        return date.strftime('%Y-%m-%d %H:%M')
    except Exception as e:
        return f"Error: {e}"

# Fetch and test
url = f"https://api.airtable.com/v0/{AIRTABLE_BASE}/{AIRTABLE_TABLE}?pageSize=1&sort[0][field]=created_at&sort[0][direction]=desc"
response = requests.get(url, headers=headers)

if response.status_code == 200:
    data = response.json()
    if data['records']:
        record = data['records'][0]
        fields = record.get('fields', {})

        updated_at_raw = fields.get('updated_at')
        if updated_at_raw:
            formatted = formatDate(updated_at_raw)
            print(f"✅ Raw value: {updated_at_raw}")
            print(f"✅ Formatted: {formatted}")
        else:
            print(f"❌ updated_at is None/empty in fields")
            print(f"   Type of fields: {type(fields)}")
            print(f"   Keys in fields: {list(fields.keys())[:10]}...")

print()
print("=" * 80)
print("🎯 RECOMMENDATION:")
print("=" * 80)
print()
print("If updated_at is NOT showing in Test 2:")
print("  1. The Airtable schema shows it exists ✓")
print("  2. But the API is not returning it")
print("  3. Possible causes:")
print("     • New field hasn't been populated on all records yet")
print("     • Records were created before the field existed")
print("     • Need to manually populate the field")
print()
print("SOLUTION: Update all records with the current timestamp")
print()

