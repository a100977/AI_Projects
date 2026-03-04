#!/usr/bin/env python3
"""
Check the project that's causing 403 errors
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
PROJECTS_TABLE = (cfg.get("TABLE_PROJECTS") or "magnum_projects").strip()

if not BASE_ID or not PAT:
    raise RuntimeError("Missing BaseId/PAT in artwork/config.json")

# Project IDs from the error
PROBLEM_PROJECT = "reclRrpiAqu5l909x"
WORKING_PROJECT_1 = "recZLdspjEHk4sxk3"
WORKING_PROJECT_2 = "recU6UvM4xobkE2G3"

headers = {
    "Authorization": f"Bearer {PAT}"
}

def check_project(project_id, name):
    print(f"\n{'='*60}")
    print(f"Checking {name}: {project_id}")
    print('='*60)

    url = f"https://api.airtable.com/v0/{BASE_ID}/{PROJECTS_TABLE}/{project_id}"
    response = requests.get(url, headers=headers)

    print(f"HTTP Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        fields = data.get('fields', {})
        print(f"✓ Project found")
        print(f"  Name: {fields.get('project_name', 'N/A')}")
        print(f"  Status: {fields.get('status', 'N/A')}")
        print(f"  Mode: {fields.get('mode', 'N/A')}")
        print(f"  Demo Record: {fields.get('demo_record', 'N/A')}")
        print(f"\n  All fields:")
        for key, value in fields.items():
            if isinstance(value, str) and len(str(value)) > 100:
                print(f"    {key}: {str(value)[:100]}...")
            else:
                print(f"    {key}: {value}")
    elif response.status_code == 403:
        print(f"✗ 403 Forbidden - No access to this record")
        print(f"  This could mean:")
        print(f"  - The record exists but your API key doesn't have permission")
        print(f"  - The record has been deleted")
        print(f"  - There's a sharing/permission issue in Airtable")
    elif response.status_code == 404:
        print(f"✗ 404 Not Found - Project doesn't exist")
    else:
        print(f"✗ Error: {response.text}")

def list_all_projects():
    print(f"\n{'='*60}")
    print(f"Listing all projects in magnum_projects table")
    print('='*60)

    url = f"https://api.airtable.com/v0/{BASE_ID}/{PROJECTS_TABLE}"
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()
        records = data.get('records', [])
        print(f"Total projects: {len(records)}\n")

        for record in records:
            rid = record.get('id')
            fields = record.get('fields', {})
            name = fields.get('project_name', 'Unknown')
            mode = fields.get('mode', 'N/A')
            demo_rec = fields.get('demo_record', 'Not set')
            status = fields.get('status', 'N/A')

            print(f"ID: {rid}")
            print(f"  Name: {name}")
            print(f"  Mode: {mode}")
            print(f"  Status: {status}")
            print(f"  Demo Record: {demo_rec}")
            print()

if __name__ == "__main__":
    check_project(PROBLEM_PROJECT, "PROBLEM PROJECT")
    check_project(WORKING_PROJECT_1, "Working Project 1")
    check_project(WORKING_PROJECT_2, "Working Project 2")
    list_all_projects()
