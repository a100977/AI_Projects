# Document Merge Plugin

> Universal document merge for Finance & Legal industries - merge variables from **any data source** into **any document format**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Issues](https://img.shields.io/github/issues/a100977/AI_Projects)](https://github.com/a100977/AI_Projects/issues)
[![GitHub Stars](https://img.shields.io/github/stars/a100977/AI_Projects)](https://github.com/a100977/AI_Projects)

## Features

✅ **Universal Data Source Support** - Connect to any data source (Airtable, PostgreSQL, MySQL, MongoDB, REST APIs, GraphQL, Salesforce, Google Sheets, CSV, JSON, Custom)

✅ **Multi-Format Support** - Merge into any document format (DOCX, PDF, XLSX, CSV, JSON, TXT, HTML, XML)

✅ **Smart Variable Detection** - Auto-detect merge variables in your documents with high confidence

✅ **Review & Edit Workflow** - Preview detected variables, fix errors, add/remove variables before processing

✅ **Batch Processing** - Generate 100s or 1000s of documents efficiently in parallel

✅ **Data Validation** - Validate data quality before generating documents

✅ **Audit Trail** - Full tracking of who merged what and when

✅ **Error Recovery** - Auto-suggest fixes for common issues

✅ **Extensible** - Add custom data source connectors and transformations

## Use Cases

### Legal Industry
- Eviction complaints (Airtable → PDF)
- Settlement agreements (Database → DOCX)
- Promissory notes (REST API → PDF)
- Court filings (Salesforce → PDF)
- Batch legal letters (CSV → ZIP)

### Finance Industry
- Invoices (Database → PDF)
- Loan agreements (REST API → DOCX)
- Payment statements (Airtable → XLSX)
- Financial statements (API → PDF)
- Bulk payroll documents (CSV → ZIP)

### Other Industries
- Healthcare forms (Salesforce → PDF)
- Real estate lease agreements (API → DOCX)
- Educational certificates (Database → PDF)
- Any variable replacement scenario

## Installation

### Claude Code Plugin (Recommended)

```bash
/plugin marketplace add a100977/AI_Projects
/plugin install document-merge@amit-gupta-marketplace
```

Then use:
```bash
/document-merge:detect-variables
/document-merge:review-mapping
/document-merge:merge-document
/document-merge:batch-merge
```

### Standalone Packages

**npm:**
```bash
npm install @amit-gupta/document-merge
npx document-merge --help
```

**Python:**
```bash
pip install document-merge
document-merge --help
```

**Docker:**
```bash
docker run -p 3000:3000 amit-gupta/document-merge:latest
```

## Quick Start (5 minutes)

### 1. Detect Variables in Your Document

```bash
/document-merge:detect-variables
```

Upload your template document (DOCX, PDF, XLSX, etc.)

System detects variables like: `{{$CaseID}}`, `{{$PlaintiffName}}`, `{{$PropertyAddress}}`

### 2. Connect Your Data Source

Choose where your data is:
- Airtable table
- PostgreSQL database
- REST API endpoint
- CSV file
- Google Sheets
- Salesforce
- Any other source

### 3. Review & Map Variables

```bash
/document-merge:review-mapping
```

- Review auto-suggested field mappings
- Fix any typos or errors
- Add additional variables you want
- Preview actual data values
- Validate data quality

### 4. Generate Document

```bash
/document-merge:merge-document
```

System merges variables and generates your document in the requested format.

### 5. (Optional) Batch Generate

For 100s or 1000s of documents:

```bash
/document-merge:batch-merge
```

Generates all documents in parallel and returns ZIP file.

## Documentation

- **[Quick Start](docs/QUICK_START.md)** - 5-minute getting started guide
- **[User Guide](docs/USER_GUIDE.md)** - How to use each skill
- **[Installation Guide](docs/INSTALLATION.md)** - Detailed installation instructions
- **[API Reference](docs/API_REFERENCE.md)** - REST API endpoints
- **[Data Sources](docs/DATA_SOURCES.md)** - How to configure each data source
- **[Document Formats](docs/DOCUMENT_FORMATS.md)** - Supported formats & limitations
- **[Examples](docs/examples/)** - Real-world use cases
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues & solutions
- **[Architecture](docs/ARCHITECTURE.md)** - System design & how it works

## Examples

### Eviction Complaint (Airtable → PDF)

```bash
/document-merge:merge-document
```

Config:
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
    "{{$PropertyAddress}}": "Property.Address"
  },
  "outputFormat": "pdf"
}
```

### Invoice (PostgreSQL → PDF)

```json
{
  "document": "invoice_template.docx",
  "dataSource": {
    "type": "postgresql",
    "connectionString": "postgresql://user:pass@host/db",
    "query": "SELECT * FROM invoices WHERE id = $1",
    "params": ["INV-2025-001"]
  },
  "variableMapping": {
    "{{$InvoiceID}}": "id",
    "{{$ClientName}}": "client.name",
    "{{$Amount}}": "total_amount"
  },
  "outputFormat": "pdf"
}
```

### Batch Letters (CSV → ZIP)

```json
{
  "document": "letter_template.docx",
  "dataSource": {
    "type": "csv",
    "content": "contacts.csv"
  },
  "variableMapping": {
    "{{$Name}}": "Name",
    "{{$Address}}": "Address"
  },
  "outputFormat": "pdf",
  "batchProcessing": {
    "enabled": true,
    "outputPackage": "zip"
  }
}
```

See [more examples](docs/examples/).

## Supported Data Sources

| Source | Status | Details |
|--------|--------|---------|
| Airtable | ✅ Ready | API key auth |
| PostgreSQL | ✅ Ready | Connection string |
| MySQL | 🔄 Soon | Connection string |
| MongoDB | 🔄 Soon | Connection string |
| REST API | ✅ Ready | Bearer, API Key, Basic auth |
| GraphQL API | 🔄 Soon | Bearer auth |
| Salesforce | 🔄 Soon | OAuth2 |
| Google Sheets | 🔄 Soon | Service account |
| CSV | ✅ Ready | File or URL |
| JSON | ✅ Ready | Inline or file |
| Custom | ✅ Ready | User-defined connector |

## Supported Document Formats

| Format | Parse | Generate | Status |
|--------|-------|----------|--------|
| DOCX | ✅ | ✅ | Ready |
| PDF | ✅ | ✅ | Ready |
| XLSX | ✅ | ✅ | Ready |
| CSV | ✅ | ✅ | Ready |
| JSON | ✅ | ✅ | Ready |
| TXT | ✅ | ✅ | Ready |
| HTML | 🔄 | 🔄 | Soon |
| XML | 🔄 | 🔄 | Soon |

## Cloud API

Freemium API available at `https://api.document-merge.dev`

```bash
curl -X POST https://api.document-merge.dev/v1/merge \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Pricing:**
- **Free**: 100 documents/month, basic connectors
- **Pro**: $29/month, 10,000 documents/month, all connectors
- **Enterprise**: $299+/month, unlimited, white-label, custom support

## Architecture

Document Merge consists of:

1. **Variable Detector** - Auto-detects merge variables in documents
2. **Mapping Engine** - Fuzzy matches variables to data source fields
3. **Data Connectors** - Pluggable connectors for different data sources
4. **Document Formatters** - Format-specific document parsing & generation
5. **Merge Engine** - Core merge logic with transformations
6. **Review Workflow** - Three-phase workflow (detect → review → process)
7. **Batch Processor** - Parallel processing for bulk documents
8. **Audit Logger** - Full audit trail of all operations

See [Architecture Guide](docs/ARCHITECTURE.md) for detailed design.

## Development

### Prerequisites
- Node.js 18+
- npm or pnpm
- Git

### Setup

```bash
git clone https://github.com/a100977/AI_Projects.git
cd claude_plugin/document-merge-plugin

# Backend
cd backend
npm install
npm run dev  # Starts on port 3000

# In another terminal, test the plugin
claude --plugin-dir .
```

### Running Tests

```bash
cd backend
npm test              # Unit tests
npm run test:integration  # Integration tests
npm run test:coverage     # Coverage report
```

### Building

```bash
npm run build         # Build TypeScript
npm run lint          # Lint code
npm run format        # Format code
```

See [Development Guide](docs/DEVELOPMENT.md) for more details.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

Areas we need help with:
- [ ] Additional data source connectors
- [ ] Additional document format support
- [ ] Performance optimizations
- [ ] Documentation improvements
- [ ] Bug fixes & issue reports
- [ ] Feature requests & discussions

## Roadmap

**Current Phase:** 1 (Foundation)

**Next 6 Months:**
- [ ] Phase 2: Core features (Week 2-3)
- [ ] Phase 3: Claude Code integration (Week 4)
- [ ] Phase 4: npm/PyPI/Docker (Week 5)
- [ ] Phase 5: Cloud API (Week 6)
- [ ] Phase 6: Launch & growth (Week 7+)

See [full roadmap](docs/ROADMAP.md).

## Support

- 📖 **Documentation**: [docs/](docs/)
- 💬 **GitHub Discussions**: [GitHub Discussions](https://github.com/a100977/AI_Projects/discussions)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/a100977/AI_Projects/issues)
- 📧 **Email**: a1009us@gmail.com
- 💻 **Cloud API**: [https://api.document-merge.dev](https://api.document-merge.dev)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

Created by [Amit Gupta](https://github.com/a100977)

Building on the EvictSure PrintMerge system to create a universal document merge solution.

---

**Status:** Early development (Phase 1)
**Last Updated:** 2025-02-26
**Next Milestone:** Phase 1 completion (Week 1)
