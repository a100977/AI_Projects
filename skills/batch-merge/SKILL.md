# Batch Merge

Generate multiple documents in bulk from a data source (great for 100s or 1000s of documents).

## Description

This skill processes multiple records from a data source and generates a document for each one. Perfect for:

- Generating 1000 eviction complaints from a spreadsheet
- Creating invoices for all customers
- Sending personalized letters to multiple recipients
- Bulk document generation for any scenario

**Key features:**
- Parallel processing (configurable)
- Progress tracking
- Error handling per document
- Multiple output options (ZIP, S3, array)
- Efficient memory management
- Retry logic for failed documents

## Usage

```
/document-merge:batch-merge
```

## Parameters

- **document** (required): Your template document

- **dataSource** (required): Data source with MULTIPLE records
  - Query should return multiple records (not just one)
  - System will fetch all matching records
  - Supports pagination and limits

- **variableMapping** (required): Variable → field mappings

- **output** (required): Output format for all documents

- **batchProcessing** (required): Batch options
  - **parallelism**: Number of documents to process simultaneously (default: 10)
  - **outputFormat**: 'zip', 's3', 'folder', or 'array'
  - **s3Bucket** (if outputFormat is 's3'): AWS S3 bucket name
  - **s3Prefix** (if outputFormat is 's3'): Prefix for files in S3

## Output

```json
{
  "status": "completed",
  "jobId": "job_xyz123",
  "totalRecords": 1000,
  "processed": 998,
  "successful": 998,
  "failed": 2,
  "skipped": 0,
  "processingTime": "2m 15s",
  "estimatedCompletionTime": "2m 15s",

  "output": {
    "format": "zip",
    "url": "https://api.document-merge.dev/jobs/job_xyz123/download",
    "size": "245 MB",
    "fileCount": 998
  },

  "errors": [
    {
      "recordId": "rec789",
      "recordNumber": 43,
      "error": "Missing required field: PlaintiffName",
      "severity": "error"
    },
    {
      "recordId": "rec456",
      "recordNumber": 127,
      "error": "Phone number format invalid (will use as-is)",
      "severity": "warning"
    }
  ],

  "statistics": {
    "averageProcessingTimePerDocument": "135ms",
    "successRate": "99.8%",
    "failureRate": "0.2%"
  }
}
```

## Examples

### Batch Eviction Complaints (1000 records from Airtable → ZIP)

```json
{
  "document": "eviction_complaint.docx",
  "dataSource": {
    "type": "airtable",
    "baseId": "appXXXXXXXX",
    "apiKey": "YOUR_API_KEY",
    "tableId": "tblCases",
    "filter": "{Status} = 'Ready for Filing'"
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
  },
  "batchProcessing": {
    "parallelism": 25,
    "outputFormat": "zip"
  }
}
```

### Bulk Invoices (500 records from PostgreSQL → S3)

```json
{
  "document": "invoice.docx",
  "dataSource": {
    "type": "postgresql",
    "connectionString": "postgresql://user:pass@host/db",
    "query": "SELECT * FROM invoices WHERE status = $1 ORDER BY created_at DESC LIMIT 500",
    "params": ["pending"]
  },
  "variableMapping": {
    "{{$InvoiceID}}": "invoice_id",
    "{{$ClientName}}": "client.name",
    "{{$Amount}}": {
      "source": "total_amount",
      "transform": "currency(value, 'USD')"
    }
  },
  "output": {
    "format": "pdf"
  },
  "batchProcessing": {
    "parallelism": 50,
    "outputFormat": "s3",
    "s3Bucket": "my-bucket",
    "s3Prefix": "invoices/2025-02/"
  }
}
```

### Batch Letters (all from CSV → ZIP)

```json
{
  "document": "letter.docx",
  "dataSource": {
    "type": "csv",
    "content": "contacts.csv"
  },
  "variableMapping": {
    "{{$Name}}": "Name",
    "{{$Address}}": "Address",
    "{{$City}}": "City",
    "{{$State}}": "State",
    "{{$Zip}}": "Zip"
  },
  "output": {
    "format": "pdf"
  },
  "batchProcessing": {
    "parallelism": 100,
    "outputFormat": "zip"
  }
}
```

### Bulk Settlement Agreements (API → S3, High Parallelism)

```json
{
  "document": "settlement.docx",
  "dataSource": {
    "type": "rest_api",
    "baseUrl": "https://api.example.com/v1",
    "endpoint": "/cases",
    "method": "GET",
    "queryParams": {
      "status": "ready_for_settlement"
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
    "format": "pdf"
  },
  "batchProcessing": {
    "parallelism": 100,
    "outputFormat": "s3",
    "s3Bucket": "settlements-bucket",
    "s3Prefix": "2025-q1/"
  }
}
```

## Parallelism

Control how many documents are processed simultaneously:

- **parallelism: 1** - Process sequentially (slower but less resource usage)
- **parallelism: 10** (default) - Good balance
- **parallelism: 50-100** - High parallelism (faster, needs more memory)
- **parallelism: 200+** - Very high (risk of rate limiting on APIs)

### Recommendations

```
CSV/JSON (local):           parallelism: 100+
Airtable:                   parallelism: 10-25
PostgreSQL (local):         parallelism: 50-100
REST API (external):        parallelism: 10-25
Salesforce:                 parallelism: 5-10
```

## Output Options

### ZIP (download as file)

```json
{
  "batchProcessing": {
    "outputFormat": "zip"
  }
}
```

All documents returned as single ZIP file. Perfect for downloading & distributing.

### S3 (upload to cloud storage)

```json
{
  "batchProcessing": {
    "outputFormat": "s3",
    "s3Bucket": "my-bucket",
    "s3Prefix": "documents/2025-02/"
  }
}
```

Documents uploaded directly to S3. Returns S3 URLs instead of ZIP.

### Array (in memory)

```json
{
  "batchProcessing": {
    "outputFormat": "array"
  }
}
```

Returns all documents as base64-encoded array. Useful for further processing.

## Monitoring Progress

For long-running batch jobs:

```bash
/document-merge:batch-status
```

Query job status:
- jobId: "job_xyz123"
- Returns: progress %, processed count, estimated time remaining

## Error Handling

**Document-level errors are not fatal:**
- Failed documents are recorded
- Processing continues
- Other documents complete successfully
- Error report includes details on each failure

**Common errors:**
- Missing required field → Document skipped
- Data type mismatch → Fallback value used
- Transformation failed → Original value used

**Retry logic:**
- Failed documents are retried once automatically
- Manual retry available via API

## Best Practices

1. **Start small** - Test with 10-20 records first
2. **Monitor progress** - Check job status for long operations
3. **Handle errors** - Check error report after completion
4. **Optimize parallelism** - Find sweet spot for your data source
5. **Use S3** - For very large batches (>10GB), use S3 output
6. **Validate first** - Use `/document-merge:review-mapping` before batch

## Rate Limiting

Be aware of API rate limits:

- **Airtable**: 5 req/sec → parallelism max 5
- **Salesforce**: 600 req/min → parallelism max 10
- **PostgreSQL**: No limits → parallelism 100+
- **REST APIs**: Depends on provider → start with 5-10

## Next Steps

After batch merge:

1. Download ZIP or access S3 files
2. Distribute documents to recipients
3. Log processing in your system
4. Handle errors as needed

---

**Status:** Ready
**Phase:** 1 (Foundation)
**Last Updated:** 2025-02-26
