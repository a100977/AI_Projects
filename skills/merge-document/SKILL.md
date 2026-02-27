# Merge Document

Merge variables into a document from any data source and generate output in any format.

## Description

This skill performs the final merge operation. It takes your document, connects to a data source, and replaces all variables with actual data.

**Typical workflow:**
1. Use `/document-merge:detect-variables` to find variables
2. Use `/document-merge:review-mapping` to review/edit mappings
3. Use this skill (`/document-merge:merge-document`) to generate the final document

But you can also use this skill directly if you have the mappings ready!

## Usage

```
/document-merge:merge-document
```

## Parameters

- **document** (required): Your template document
  - DOCX, PDF, XLSX, CSV, JSON, TXT, HTML, XML
  - Upload file or provide URL

- **dataSource** (required): Where to get the data
  - Type: 'airtable', 'postgresql', 'mysql', 'mongodb', 'rest_api', 'graphql_api', 'salesforce', 'google_sheets', 'csv', 'json', 'custom'
  - Connection details specific to each source type
  - Query to fetch the specific record(s)

- **variableMapping** (required): Map variables to fields
  - `{{$VariableName}}` → `"field.name"` or `"Nested.Field.Name"`
  - Optional transformations: `formatDate()`, `currency()`, etc.

- **output** (required): Output format
  - Format: 'docx', 'pdf', 'xlsx', 'csv', 'json', 'txt', 'html', 'xml'

## Output

```json
{
  "success": true,
  "document": "<base64 or buffer>",
  "fileName": "output.pdf",
  "format": "pdf",
  "mergeSummary": {
    "variablesMapped": 8,
    "variablesReplaced": 8,
    "variablesFailed": 0,
    "dataSourceRecordsFetched": 1,
    "processingTime": "245ms"
  },
  "auditLog": {
    "mergedBy": "user@example.com",
    "mergedAt": "2025-02-26T10:30:00Z",
    "dataSource": "airtable",
    "recordId": "rec123ABC",
    "variables": {
      "{{$CaseID}}": "CASE-2025-001",
      "{{$PlaintiffName}}": "John Smith",
      "{{$PropertyAddress}}": "123 Main St, Chicago, IL 60601"
    }
  },
  "validationReport": {
    "success": true,
    "warnings": [],
    "errors": []
  }
}
```

## Examples

### Eviction Complaint (Airtable → PDF)

```json
{
  "document": "eviction_complaint.docx",
  "dataSource": {
    "type": "airtable",
    "baseId": "appXXXXXXXX",
    "apiKey": "YOUR_API_KEY",
    "recordId": "rec123ABC"
  },
  "variableMapping": {
    "{{$CaseID}}": "CaseID",
    "{{$PlaintiffName}}": "Plaintiff.Name",
    "{{$DefendantName}}": "Defendant.Name",
    "{{$PropertyAddress}}": "Property.Address",
    "{{$FilingDate}}": {
      "source": "FilingDate",
      "transform": "formatDate(value, 'MM/DD/YYYY')"
    }
  },
  "output": {
    "format": "pdf"
  }
}
```

### Invoice (PostgreSQL → PDF)

```json
{
  "document": "invoice.docx",
  "dataSource": {
    "type": "postgresql",
    "connectionString": "postgresql://user:pass@host/db",
    "query": "SELECT * FROM invoices WHERE id = $1",
    "params": ["INV-2025-001"]
  },
  "variableMapping": {
    "{{$InvoiceID}}": "id",
    "{{$ClientName}}": "client.name",
    "{{$Amount}}": {
      "source": "total_amount",
      "transform": "currency(value, 'USD')"
    },
    "{{$DueDate}}": {
      "source": "due_date",
      "transform": "formatDate(value, 'MM/DD/YYYY')"
    }
  },
  "output": {
    "format": "pdf"
  }
}
```

### Settlement Agreement (REST API → DOCX)

```json
{
  "document": "settlement.docx",
  "dataSource": {
    "type": "rest_api",
    "baseUrl": "https://api.example.com/v1",
    "endpoint": "/cases/{caseId}",
    "method": "GET",
    "pathParams": {
      "caseId": "CASE-2025-001"
    },
    "auth": {
      "type": "bearer",
      "token": "YOUR_TOKEN"
    }
  },
  "variableMapping": {
    "{{$CaseID}}": "caseNumber",
    "{{$Plaintiff}}": "plaintiff.name",
    "{{$Defendant}}": "defendant.name",
    "{{$SettlementAmount}}": {
      "source": "settlementAmount",
      "transform": "currency(value, 'USD')"
    }
  },
  "output": {
    "format": "docx"
  }
}
```

### Form (CSV → Excel)

```json
{
  "document": "form.xlsx",
  "dataSource": {
    "type": "csv",
    "content": "data.csv",
    "matchColumn": "ID",
    "matchValue": "123"
  },
  "variableMapping": {
    "{{$Name}}": "FullName",
    "{{$Email}}": "Email",
    "{{$Phone}}": "PhoneNumber"
  },
  "output": {
    "format": "xlsx"
  }
}
```

## Transformations

Available transformations:

```
formatDate(value, format)       → "2025-02-26" → "02/26/2025"
formatTime(value, format)       → "14:30:00" → "2:30 PM"
currency(value, locale)         → 1000 → "$1,000.00"
uppercase(value)                → "john" → "JOHN"
lowercase(value)                → "JOHN" → "john"
capitalize(value)               → "john smith" → "John Smith"
trim(value)                     → "  john  " → "john"
phone(value)                    → "5551234567" → "(555) 123-4567"
combine([val1, val2], sep)      → ["Main", "St"] → "Main St"
```

See [Transformations Guide](../../docs/TRANSFORMATIONS.md) for more.

## Options

### dryRun

Preview what will be merged without actually generating the document:

```json
{
  "document": "template.docx",
  "dataSource": {...},
  "variableMapping": {...},
  "options": {
    "dryRun": true
  }
}
```

### strictMode

Fail if any variable is unmapped or data is missing:

```json
{
  "options": {
    "strictMode": true
  }
}
```

## Error Handling

**Errors are returned if:**
- Document can't be parsed
- Data source connection fails
- Query execution fails
- Variable mapping is invalid
- Data type mismatch

**Warnings are returned if:**
- Data quality is low
- Field format may be invalid
- Transformation failed but fallback used

## Next Steps

After merging:

1. Download the generated document
2. For bulk documents, use `/document-merge:batch-merge`
3. To merge again, go back to `/document-merge:detect-variables`

## Common Issues

**"Connection failed"**
- Check data source credentials
- Verify network access
- Test connection: `/document-merge:connectors/test`

**"Variable not replaced"**
- Check variable is in document (visible text)
- Check mapping is correct
- Use `/document-merge:review-mapping` to verify

**"Data type mismatch"**
- Expected string but got number
- Use transformation to convert
- e.g., `currency()` for amounts

**"PDF not generating"**
- PDF generation can take longer
- Check error message for details
- Try DOCX first, convert to PDF later

---

**Status:** Ready
**Phase:** 1 (Foundation)
**Last Updated:** 2025-02-26
