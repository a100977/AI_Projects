import requests
import json
from pathlib import Path


def load_config():
    config_path = Path(__file__).resolve().parent / "artwork" / "config.json"
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


cfg = load_config()
AIRTABLE_BASE = (cfg.get("BaseId") or "").strip()
API_KEY = (cfg.get("PAT") or "").strip()
AIRTABLE_TABLE = (cfg.get("TABLE_ARTWORK") or "magnum_artwork").strip()

if not AIRTABLE_BASE or not API_KEY:
    raise RuntimeError("Missing BaseId/PAT in artwork/config.json")

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Get table schema
print("🔍 Checking Airtable schema...\n")
schema_url = f"https://api.airtable.com/v0/meta/bases/{AIRTABLE_BASE}/tables"
response = requests.get(schema_url, headers=headers)

if response.status_code == 200:
    tables = response.json()['tables']
    magnum_table = next(
        (t for t in tables if t['id'] == AIRTABLE_TABLE or t['name'] == AIRTABLE_TABLE),
        None
    )
    
    if magnum_table:
        print(f"✅ Table: {magnum_table['name']}")
        print(f"📋 Fields in table:")
        print("─" * 60)
        
        for field in magnum_table['fields']:
            field_name = field['name']
            field_type = field['type']
            print(f"  • {field_name:30} ({field_type})")
        
        # Check for updated_at field
        has_updated_at = any(f['name'] == 'updated_at' for f in magnum_table['fields'])
        print("─" * 60)
        
        if has_updated_at:
            print("\n✅ 'updated_at' field EXISTS in schema")
        else:
            print("\n❌ 'updated_at' field NOT FOUND in schema")
            print("\n📝 To add this field:")
            print("   1. Go to: https://airtable.com/app/appZx9cFhNDZwsR5f")
            print("   2. Click the '+' button next to the field headers")
            print("   3. Name it: 'updated_at'")
            print("   4. Type: 'Date & Time' or 'Last modified time'")
    else:
        print("❌ Table not found")
else:
    print(f"❌ Error: {response.status_code}")
    print(response.text)

# Also get a sample record to see what data is there
print("\n\n🔍 Checking sample record data...\n")
records_url = f"https://api.airtable.com/v0/{AIRTABLE_BASE}/{AIRTABLE_TABLE}?maxRecords=1"
response = requests.get(records_url, headers=headers)

if response.status_code == 200:
    records = response.json()['records']
    if records:
        record = records[0]
        fields = record['fields']
        print(f"Record ID: {record['id']}")
        print(f"Fields:")
        print("─" * 60)
        for key, value in fields.items():
            if key in ['updated_at', 'report_generated_at', 'created_at']:
                print(f"  📅 {key}: {value}")
            elif isinstance(value, str) and len(value) < 100:
                print(f"  • {key}: {value[:50]}")
        print("─" * 60)
    else:
        print("No records found")
else:
    print(f"Error: {response.status_code}")
