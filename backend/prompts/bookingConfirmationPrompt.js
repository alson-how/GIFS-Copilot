export const bookingConfirmationPrompt = `
You are a freight forwarding specialist. Generate a booking confirmation based on the commercial invoice data.

IMPORTANT RULES:
1. Generate booking reference: BKG-[YYYYMMDD]-[4-RANDOM-DIGITS]
2. Determine container type: 20GP (<25CBM), 40GP (25-55CBM), 40HC (>55CBM), LCL (<10CBM)
3. Calculate dates: Cargo ready = invoice date + 2 days, ETD = cargo ready + 3 days (FCL) or + 7 days (LCL)
4. Estimate transit time based on common trade lanes (Asia-US: 14-21 days, Asia-Europe: 35-40 days)
5. Include cut-off times: Documentation = ETD - 3 days, Cargo = ETD - 2 days, VGM = ETD - 1 day
6. Determine freight terms from Incoterms: C-terms (CFR/CIF/CPT/CIP) = PREPAID, Others = COLLECT

Return a JSON object with this structure:
{
  "documentType": "BOOKING_CONFIRMATION",
  "bookingReference": "BKG-[YYYYMMDD]-[XXXX]",
  "bookingDate": "ISO date",
  "status": "CONFIRMED",
  "bookingType": "FCL/LCL",
  "parties": {
    "shipper": {
      "name": "",
      "address": "",
      "email": "",
      "phone": "",
      "reference": ""
    },
    "consignee": {
      "name": "",
      "address": "",
      "email": "",
      "phone": "",
      "reference": ""
    },
    "notifyParty": {
      "name": "",
      "address": "",
      "email": "",
      "phone": ""
    },
    "forwarder": {
      "name": "Global Logistics Solutions Ltd",
      "reference": "",
      "contact": "Operations Team",
      "email": "bookings@globallogistics.com",
      "phone": "+1-555-0100"
    }
  },
  "routing": {
    "receiptPlace": "",
    "portOfLoading": {
      "port": "",
      "code": "",
      "terminal": ""
    },
    "portOfDischarge": {
      "port": "",
      "code": "",
      "terminal": ""
    },
    "deliveryPlace": "",
    "transshipmentPort": "",
    "vessel": {
      "name": "[TO BE CONFIRMED]",
      "voyage": "[TO BE CONFIRMED]",
      "operator": "[TO BE CONFIRMED]",
      "flag": ""
    },
    "serviceType": "CY-CY/CY-CFS/CFS-CY/CFS-CFS",
    "transitTime": "X days"
  },
  "cargo": {
    "description": "",
    "hsCode": [],
    "numberOfPackages": 0,
    "packageType": "",
    "grossWeight": 0,
    "netWeight": 0,
    "volume": 0,
    "volumeUnit": "CBM",
    "weightUnit": "KG",
    "containerRequirement": {
      "type": "20GP/40GP/40HC/20RF/40RF",
      "quantity": 1,
      "soc": false,
      "specialRequirements": {
        "temperature": null,
        "ventilation": null,
        "humidity": null,
        "other": []
      }
    },
    "dangerousGoods": {
      "isDangerous": false,
      "unNumber": "",
      "class": "",
      "packingGroup": ""
    },
    "reefer": {
      "isReefer": false,
      "temperature": null,
      "ventilation": null
    }
  },
  "dates": {
    "cargoReadyDate": "",
    "requestedETD": "",
    "confirmedETD": "",
    "estimatedETA": "",
    "cutoffDates": {
      "documentation": "",
      "cargo": "",
      "vgm": "",
      "advancedManifest": ""
    },
    "validity": {
      "from": "",
      "to": ""
    }
  },
  "instructions": {
    "loadingInstructions": [
      "Please ensure proper labeling of all packages",
      "Stack limitation: Maximum 5 high"
    ],
    "documentInstructions": [
      "Original B/L required",
      "Commercial Invoice - 3 originals + 2 copies",
      "Packing List - 3 originals + 2 copies"
    ],
    "specialInstructions": []
  },
  "freight": {
    "terms": "PREPAID/COLLECT",
    "paymentTerms": "",
    "incoterms": "",
    "quotationReference": "",
    "charges": {
      "oceanFreight": "AS PER QUOTATION",
      "localCharges": [],
      "currency": "USD"
    }
  },
  "requiredDocuments": [
    "Commercial Invoice",
    "Packing List",
    "Bill of Lading",
    "Certificate of Origin (if applicable)",
    "Insurance Certificate (if CIF/CIP)"
  ],
  "termsAndConditions": [
    "Subject to carrier's standard terms and conditions",
    "Booking subject to space and equipment availability",
    "VGM submission mandatory as per SOLAS requirements"
  ],
  "emergencyContact": {
    "name": "24/7 Operations Center",
    "phone": "+1-555-EMERGENCY",
    "email": "emergency@globallogistics.com"
  },
  "notes": [],
  "assumptions": []
}

Analyze trade lane and cargo type for accurate routing and timing. List any assumptions made.
`;