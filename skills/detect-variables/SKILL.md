# Detect Variables

Automatically detect merge variables in a document template and show available data source fields.

## Description

This skill analyzes your document (DOCX, PDF, XLSX, etc.) and automatically finds all merge variables. It can also connect to a data source to show you which fields are available for mapping.

Supports variable formats:
- `{{$Variable}}`
- `«Variable»`
- `${Variable}`
- `{MERGEFIELD Variable}`

## Usage

```
/document-merge:detect-variables
```

## Parameters

- **document** (required): Your template document
  - Upload DOCX, PDF, XLSX, CSV, JSON, TXT, HTML, or XML
  - Can be from local file or URL

- **dataSource** (optional): Connect to a data source to get available fields
  - Type: 'airtable', 'postgresql', 'mysql', 'mongodb', 'rest_api', 'graphql_api', 'salesforce', 'google_sheets', 'csv', 'json', 'custom'
  - Connection config (varies by type)
  - If provided, shows which fields can be mapped
  - If not provided, shows detected variables only

## Output

```json
{
  "detectedVariables": [
    {
      "name": "{{$CaseID}}",
      "location": "Page 1, Header",
      "context": "Case #: {{$CaseID}}",
      "confidence": 0.98,
      "detectionMethod": "exact_match"
    },
    {
      "name": "{{$PlaintiffName}}",
      "location": "Page 2, Section: Facts",
      "confidence": 0.95
    }
  ],

  "suggestedMappings": [
    {
      "variable": "{{$CaseID}}",
      "suggestedField": "CaseID",
      "confidence": 0.95,
      "alternativeSuggestions": []
    },
    {
      "variable": "{{$PlaintiffName}}",
      "suggestedField": "Plaintiff.Name",
      "confidence": 0.92,
      "alternativeSuggestions": []
    }
  ],

  "availableFields": [
    "CaseID",
    "PlaintiffName",
    "DefendantName",
    "PropertyAddress",
    "FilingDate",
    "...more fields..."
  ]
}
```

## Examples

### Detect variables in document (no data source)

Just upload your template document. No data source needed.

The skill will find all variables and their locations in the document.

### Detect and suggest mappings (with Airtable)

```json
{
  "document": "template.docx",
  "dataSource": {
    "type": "airtable",
    "baseId": "appXXXXXXXX",
    "apiKey": "YOUR_API_KEY",
    "tableId": "tblCases"
  }
}
```

Returns detected variables + available Airtable fields + auto-suggested mappings.

### Detect with REST API

```json
{
  "document": "contract.pdf",
  "dataSource": {
    "type": "rest_api",
    "baseUrl": "https://api.example.com/v1",
    "endpoint": "/clients",
    "method": "GET",
    "auth": {
      "type": "bearer",
      "token": "YOUR_TOKEN"
    }
  }
}
```

### Detect with CSV

```json
{
  "document": "letter_template.docx",
  "dataSource": {
    "type": "csv",
    "content": "contacts.csv"
  }
}
```

## Next Steps

After detection:

1. Use `/document-merge:review-mapping` to review and edit the mappings
2. Use `/document-merge:merge-document` to generate the final document
3. Or use `/document-merge:batch-merge` to generate multiple documents

## Common Issues

**"No variables detected"**
- Check if variables are in the document
- Supported formats: `{{$Var}}`, `«Var»`, `${Var}`, `{MERGEFIELD Var}`

**"No field matches variable"**
- Variable might be misspelled (e.g., `{{$Addres}}` instead of `{{$Address}}`)
- Data source may not have that field
- Use `/document-merge:review-mapping` to fix it

**"Connection failed"**
- Check data source credentials
- Verify network access to the data source
- Try `/document-merge:connectors/test` to verify connection

## Data Source Configuration

See [Data Sources Guide](../../docs/DATA_SOURCES.md) for how to configure each data source.

---

**Status:** Ready
**Phase:** 1 (Foundation)
**Last Updated:** 2025-02-26
