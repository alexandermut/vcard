# Regex Test Case Workflow

This project uses a dual-file approach for test case generation to balance privacy and test quality.

## Directory Structure

- **`tests/real_cases/`** (🔒 `.gitignore`) - Real test cases with actual data
  - Contains original OCR text and real contact information
  - Used for **local training and debugging** only
  - **NEVER committed to Git**
  - Filenames: `real_testcase_*.json`

- **`data/test_cases/`** (✅ Git tracked) - Anonymized test cases
  - Contains structure-preserving anonymized data
  - Safe to commit to repository
  - Used for **CI/CD, regression tests, and sharing**
  - Filenames: `anon_testcase_*.json`

## How It Works

### 1. Generating Test Cases

When you export a test case in **Regex Training Mode**, the system generates **TWO files simultaneously**:

#### Real Version (`real_testcase_*.json`)
```json
{
  "analysis": "Manual test case - REAL DATA (for local training only)",
  "test_case": {
    "id": "manual_real_1733515200000",
    "text": "Dr. Hans Müller\nSiemens AG\n...",
    "expected": {
      "fn": "Dr. Hans Müller",
      "tel": [{ "value": "+49 89 12345678", "type": "work" }],
      "adr": [{ 
        "value": { 
          "street": "Leopoldstraße 123",
          "city": "München",
          "zip": "80331"
        }
      }]
    }
  }
}
```

#### Anonymized Version (`anon_testcase_*.json`)
```json
{
  "analysis": "Manual test case - ANONYMIZED (safe for repository)",
  "test_case": {
    "id": "manual_anon_1733515200000",
    "text": "Dr. Max Mustermann\nMusterfirma AG\n...",
    "expected": {
      "fn": "Max Mustermann",
      "tel": [{ "value": "+49 89 12345678", "type": "work" }],
      "adr": [{ 
        "value": { 
          "street": "Hauptstraße 1",
          "city": "München",          // ✅ KEPT
          "zip": "80331"              // ✅ KEPT
        }
      }]
    }
  }
}
```

### 2. Structure-Preserving Anonymization

The anonymization keeps **structural elements** critical for parser testing:

| Data Type | Anonymization Strategy | Rationale |
|-----------|------------------------|-----------|
| **Names** | → "Max Mustermann", "Erika Musterfrau" | Generic German names |
| **Companies** | → Keep legal form (GmbH, AG, Inc.) | Parser must recognize corporate structures |
| **Phone Numbers** | → Keep area code (e.g. +49 89), replace rest | Parser must classify by region |
| **Email** | → "max.mustermann@example.com" | Generic but realistic format |
| **Streets** | → "Hauptstraße 1", "Bahnhofstraße 12" | Common German street names |
| **ZIP Codes** | ✅ **KEEP ORIGINAL** | Public data, crucial for validation |
| **Cities** | ✅ **KEEP ORIGINAL** | Public data, needed for address parsing |
| **Country** | ✅ **KEEP ORIGINAL** | Public data |
| **Whitespace/Tabs** | ✅ **PRESERVE EXACTLY** | Layout affects parser behavior |

### 3. Usage Workflow

#### For Local Development:
1. Set OCR Mode to **"🛠️ Regex Training (Debug)"**
2. Scan a business card or paste text into editor
3. Click the 🔴 JSON button
4. **Two files download:**
   - `real_testcase_*.json` → Move to `tests/real_cases/`
   - `anon_testcase_*.json` → Move to `data/test_cases/`
5. Train your parser using **real data**
6. Commit only the **anonymized data** to Git

#### For CI/CD Testing:
```bash
# Run tests with anonymized data (safe for CI)
npm test -- data/test_cases/anon_testcase_*.json
```

#### For Local Debugging:
```bash
# Run tests with real data (local only)
npm test -- tests/real_cases/real_testcase_*.json
```

## Safety Notes

⚠️ **NEVER commit files from `tests/real_cases/` to Git!**

The `.gitignore` is configured to block these files, but always double-check:

```bash
git status  # Should NOT show tests/real_cases/
```

## Why This Approach?

1. **Privacy**: Real personal data never leaves your machine
2. **Quality**: Tests use realistic data (ZIP codes, cities) for accurate validation
3. **Collaboration**: Team can improve parser without seeing real data
4. **Compliance**: Meets GDPR requirements for anonymization
