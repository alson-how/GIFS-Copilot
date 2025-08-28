# 🔍 OCR Field Mapping Documentation

## Malaysian Customs Document Processing System

This document outlines how the OCR service extracts and maps data from 9 different types of Malaysian customs documents to standardized form fields.

---

## 📋 Document Types & Field Extraction

### 1. 🧾 **COMMERCIAL INVOICE** (Primary Data Source)
*The most comprehensive document for shipment details*

| **Form Field** | **OCR Keywords/Patterns** | **Example Values** |
|----------------|---------------------------|-------------------|
| `commercial_value` | "TOTAL", "AMOUNT", "INVOICE TOTAL", "GRAND TOTAL" + currency | $25,000, USD 50,000 |
| `currency` | USD/MYR/SGD/EUR/GBP/JPY/CNY detection | USD, MYR, SGD |
| `quantity` | Number + unit patterns, "QTY", "QUANTITY" | 100, 500 PCS |
| `quantity_unit` | PCS/KG/CBM/TONS from context | PCS, KG, CBM |
| `hs_code` | 4-10 digit codes, "HS CODE", "TARIFF CODE" | 8542.39.0000 |
| `consignee_name` | "SOLD TO", "CONSIGNEE", "BUYER" | ABC Trading Ltd |
| `incoterms` | FOB/CIF/EXW/DDP keywords | FOB, CIF, EXW |
| `technology_origin` | "COUNTRY OF ORIGIN", "MADE IN" | Malaysia, Singapore |

---

### 2. 🚢 **BILL OF LADING** (Transport Details)
*Essential for shipping and logistics information*

| **Form Field** | **OCR Keywords/Patterns** | **Mapping Logic** |
|----------------|---------------------------|-------------------|
| `transport_mode` | "VESSEL", "SHIP" → Sea<br>"FLIGHT", "AIR" → Air<br>"TRUCK", "ROAD" → Land | Sea, Air, Land |
| `destination_country` | "PORT OF DISCHARGE", "DESTINATION PORT" | Singapore, China |
| `target_export_date` | "LADEN ON BOARD", "ETD", "DEPARTURE DATE" | 2024-09-15 |
| `consignee_name` | "CONSIGNEE", "NOTIFY PARTY" | Import Company Ltd |

---

### 3. 📦 **PACKING LIST** (Quantity Validation)
*Critical for quantity verification and cross-validation*

| **Form Field** | **OCR Keywords/Patterns** | **Validation Purpose** |
|----------------|---------------------------|------------------------|
| `quantity` | Carton counts, "TOTAL PIECES", "NET WEIGHT" | Cross-check with invoice |
| `quantity_unit` | KG/CBM/PCS from column headers | Unit consistency |
| `product_description` | Detailed item lists, specifications | Product verification |

---

### 4. 🌍 **CERTIFICATE OF ORIGIN** (Origin Validation)
*Proves country of manufacture for trade compliance*

| **Form Field** | **OCR Keywords/Patterns** | **Purpose** |
|----------------|---------------------------|-------------|
| `technology_origin` | "COUNTRY OF ORIGIN", "MANUFACTURED IN" | Origin verification |
| `destination_country` | "COUNTRY OF DESTINATION", "CONSIGNED TO" | Trade route validation |
| `hs_code` | Harmonized codes if present | Product classification |

---

### 5. 🛡️ **INSURANCE CERTIFICATE** (Coverage Details)
*Validates insurance coverage for high-value shipments*

| **Form Field** | **OCR Keywords/Patterns** | **Auto-Logic** |
|----------------|---------------------------|----------------|
| `commercial_value` | "SUM INSURED", "CIF VALUE", "POLICY AMOUNT" | Insurance validation |
| `insurance_required` | Always set to `true` if document exists | Automatic flag |
| `currency` | Policy currency from document | Currency consistency |

---

### 6. 📋 **IMPORT PERMIT (STA)** (Strategic Controls)
*Strategic Trade Act permits for controlled technology*

| **Form Field** | **OCR Keywords/Patterns** | **Strategic Purpose** |
|----------------|---------------------------|----------------------|
| `end_use_purpose` | "END USE", "PURPOSE", "APPLICATION" | Export control compliance |
| `semiconductor_category` | "STRATEGIC", "CONTROLLED", "DUAL USE" | Technology classification |
| `quantity` | "QUANTITY AUTHORIZED", "PERMITTED QTY" | License limit validation |

---

### 7. 💰 **LETTER OF CREDIT** (Financial Terms)
*Banking document for payment assurance*

| **Form Field** | **OCR Keywords/Patterns** | **Financial Control** |
|----------------|---------------------------|----------------------|
| `commercial_value` | "CREDIT AMOUNT", "L/C VALUE" | Payment verification |
| `target_export_date` | "LATEST SHIPMENT", "EXPIRY DATE" | Timeline compliance |
| `incoterms` | Payment terms, "TERMS OF PAYMENT" | Trade terms |

---

### 8. 📄 **DELIVERY ORDER** (Port Release)
*Port authority release document*

| **Form Field** | **OCR Keywords/Patterns** | **Logistics** |
|----------------|---------------------------|---------------|
| `consignee_name` | "CONSIGNEE", "RELEASE TO" | Delivery verification |
| `transport_mode` | Container/vessel information | Transport confirmation |
| `target_export_date` | "ARRIVAL DATE", "RELEASE DATE" | Timeline tracking |

---

### 9. 🔧 **TECHNICAL DOCUMENTATION** (Product Specifications)
*Detailed product specifications and datasheets*

| **Form Field** | **OCR Keywords/Patterns** | **Technical Purpose** |
|----------------|---------------------------|----------------------|
| `product_description` | Specifications, model numbers | Product identification |
| `semiconductor_category` | Product classifications, "IC", "PROCESSOR" | Technology categorization |
| `end_use_purpose` | Application descriptions, "FOR USE IN" | End-use verification |

---

## 🔄 Cross-Validation Rules

### **Data Consistency Checks**

| **Validation Rule** | **Documents Involved** | **Action if Mismatch** |
|---------------------|------------------------|------------------------|
| **Commercial Value Match** | Invoice ↔ Insurance ↔ L/C | Flag inconsistency, use highest confidence |
| **Quantity Alignment** | Invoice ↔ Packing List ↔ B/L | Cross-reference, validate totals |
| **Consignee Consistency** | All documents with consignee | Standardize naming, flag conflicts |
| **Date Logic** | L/C > Export Date > Arrival | Validate timeline sequence |
| **Origin Country Match** | COO ↔ Invoice ↔ Technical Docs | Ensure origin consistency |

### **Priority Hierarchy**
1. **Commercial Invoice** (Primary source - highest priority)
2. **Bill of Lading** (Transport details)
3. **Certificate of Origin** (Origin verification)
4. **Packing List** (Quantity validation)
5. **Insurance Certificate** (Value confirmation)
6. **Import Permit STA** (Strategic controls)
7. **Letter of Credit** (Financial terms)
8. **Delivery Order** (Port operations)
9. **Technical Documentation** (Product specs)

---

## 🎯 Auto-Fill Field Mapping

### **Frontend Form Fields**

| **Form Field** | **Data Sources** | **Validation** |
|----------------|------------------|----------------|
| `commercial_value` | Invoice, Insurance, L/C | Must be > 0 |
| `currency` | Invoice, Insurance | USD/MYR/SGD validation |
| `quantity` | Invoice, Packing List, STA | Must be > 0 |
| `quantity_unit` | Packing List, Invoice | PCS/KG/CBM/TONS |
| `hs_code` | Invoice, COO | 4-10 digit format |
| `consignee_name` | Invoice, B/L, D/O | Text consistency |
| `incoterms` | Invoice, L/C | FOB/CIF/EXW/DDP |
| `technology_origin` | COO, Invoice, Technical | Country validation |
| `destination_country` | B/L, COO | Country mapping |
| `transport_mode` | B/L, D/O | Sea/Air/Land |
| `target_export_date` | B/L, L/C, D/O | Date format validation |
| `end_use_purpose` | STA, Technical | Required for semiconductors |
| `insurance_required` | Insurance presence | Boolean auto-set |

---

## 🚀 Implementation Examples

### **Document Processing Flow**
```
1. Upload Documents → 2. OCR Text Extraction → 3. Document Type Detection
                                                           ↓
4. Field Extraction ← 5. Cross-Validation ← 6. Priority Resolution
                                                           ↓
7. Auto-Fill Suggestions → 8. Form Population → 9. User Verification
```

### **Confidence Scoring**
- **90-95%**: Native PDF text extraction
- **80-89%**: High-quality OCR with clear text
- **70-79%**: Standard OCR with some artifacts
- **60-69%**: Lower quality scans, requires validation
- **<60%**: Manual verification recommended

### **Error Handling**
- **Missing Fields**: Use document hierarchy for fallbacks
- **Conflicting Data**: Flag for manual review
- **Invalid Formats**: Apply data cleaning and standardization
- **Incomplete Documents**: Request additional documentation

---

## 📊 Success Metrics

- **Accuracy Rate**: >85% field extraction accuracy
- **Processing Speed**: <5 seconds per document
- **Coverage**: Support for 9 document types
- **Validation**: 5 cross-validation rules
- **Auto-Fill**: 12+ form fields populated automatically

---

*This OCR system provides comprehensive Malaysian customs document processing with intelligent field mapping, cross-validation, and automated form population for enhanced trade compliance efficiency.*
