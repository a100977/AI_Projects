# Review & Edit Mappings

Review detected variables, fix errors, add/remove variables, and preview data before processing.

## Description

This skill provides an interactive review and edit interface for your variable mappings.

**What you can do:**
- Review auto-detected variables
- Fix variable name typos (e.g., `{{$Addres}}` → `{{$Address}}`)
- Change which field each variable maps to
- Add additional variables from available fields
- Remove unnecessary variables
- Preview actual data values
- Validate data quality
- See warnings and suggestions

## Usage

```
/document-merge:review-mapping
```

## Parameters

- **document** (required): Your template document
- **dataSource** (required): Data source with connection details & query
- **edits** (optional): Changes you want to make

## What to Edit

### Fix a variable name

```json
{
  "variableId": "var_005",
  "changes": {
    "name": "{{$PropertyAddress}}"  // Fix from {{$PropertyAddres}}
  }
}
```

### Change field mapping

```json
{
  "variableId": "var_003",
  "changes": {
    "mappedField": "Plaintiff.FullName"  // Change from Plaintiff.Name
  }
}
```

### Add a new variable

```json
{
  "action": "add",
  "variableName": "{{$CourtName}}",
  "mappedField": "County.CourtName"
}
```

### Remove a variable

```json
{
  "variableId": "var_001",
  "changes": {
    "delete": true
  }
}
```

### Add transformation

```json
{
  "variableId": "var_007",
  "changes": {
    "transform": "formatDate(value, 'MM/DD/YYYY')"
  }
}
```

## Output

```json
{
  "review": {
    "detectedVariables": [
      {
        "id": "var_001",
        "name": "{{$CaseID}}",
        "location": "Page 1, Header",
        "status": "✅ mapped",
        "mappedField": "CaseID",
        "previewValue": "CASE-2025-001"
      },
      {
        "id": "var_005",
        "name": "{{$PropertyAddres}}",  // Was typo
        "status": "❌ error",
        "issues": ["Possible typo: 'Addres' should be 'Address'"],
        "suggestions": [
          {"field": "Property.Address", "confidence": 0.88}
        ]
      }
    ],

    "dataPreview": {
      "CaseID": "CASE-2025-001",
      "PlaintiffName": "John Smith",
      "PropertyAddress": "123 Main St, Chicago, IL 60601"
    },

    "validationStatus": {
      "allVariablesMapped": true,
      "allDataPresent": true,
      "dataQualityScore": "94%",
      "warnings": [
        "Phone number format may be invalid"
      ]
    },

    "summary": {
      "totalVariables": 5,
      "mapped": 5,
      "unmapped": 0,
      "issues": 0,
      "readyToProcess": true
    }
  }
}
```

## Examples

### Fix a typo

**Problem:** Variable is `{{$PropertyAddres}}` but should be `{{$PropertyAddress}}`

```json
{
  "document": "template.docx",
  "dataSource": {...},
  "edits": [
    {
      "variableId": "var_005",
      "changes": {
        "name": "{{$PropertyAddress}}",
        "mappedField": "Property.Address"
      }
    }
  ]
}
```

### Add missing variables

**Problem:** Want to merge court name and filing date that weren't detected

```json
{
  "document": "template.docx",
  "dataSource": {...},
  "edits": [
    {
      "action": "add",
      "variableName": "{{$CourtName}}",
      "mappedField": "County.CourtName"
    },
    {
      "action": "add",
      "variableName": "{{$FilingDate}}",
      "mappedField": "FilingDate",
      "transform": "formatDate(value, 'MM/DD/YYYY')"
    }
  ]
}
```

### Remove unnecessary variables

**Problem:** Detected `{{$InternalID}}` but don't want to merge it

```json
{
  "document": "template.docx",
  "dataSource": {...},
  "edits": [
    {
      "variableId": "var_001",
      "changes": {
        "delete": true
      }
    }
  ]
}
```

### Change mapping

**Problem:** `{{$Attorney}}` is currently mapped to `Plaintiff.Name` but should be `Attorney.Name`

```json
{
  "document": "template.docx",
  "dataSource": {...},
  "edits": [
    {
      "variableId": "var_003",
      "changes": {
        "mappedField": "Attorney.Name"
      }
    }
  ]
}
```

## Data Preview

The skill shows you:
- **Field values** - Exact values from data source
- **Data quality** - Issues with formatting, missing data, etc.
- **Warnings** - Suggestions for fixing potential problems
- **Confidence** - How sure we are about mappings

## Next Steps

Once you're happy with the mappings:

1. Use `/document-merge:merge-document` to generate a single document
2. Use `/document-merge:batch-merge` to generate multiple documents

## Common Issues

**"Data quality score is low"**
- Some fields have invalid formats or missing values
- See warnings for specific issues
- You can still process, but quality may be affected

**"Can't find field in data source"**
- Data source may not have that field
- Check available fields list
- Use different field or add custom transformation

**"Unmapped variables"**
- Some detected variables don't have mappings
- Either map them or delete them (use `delete: true`)
- Can't process until all variables are mapped or deleted

---

**Status:** Ready
**Phase:** 1 (Foundation)
**Last Updated:** 2025-02-26
