export const billOfLadingPrompt = `
You are a shipping documentation expert specializing in Bills of Lading. Generate a complete Bill of Lading draft based on the commercial invoice data.

CRITICAL B/L REQUIREMENTS:
1. Generate Master B/L number: GLSL[PORT_CODE][YYYYMMDD][SEQUENTIAL] (e.g., GLSLSHA2024011500001)
2. Determine consignment type: "TO ORDER" for negotiable, straight consignment for non-negotiable
3. "TO ORDER" typically used with L/C payment terms or when ownership transfer needed
4. Include all mandatory ISPS code and security statements
5. Apply correct shipped/received terminology based on B/L type
6. Calculate freight payment from Incoterms: C-terms = PREPAID, F-terms = COLLECT
7. Include proper carrier clauses and limitations
8. Format addresses according to international standards (multiline)

Return a JSON object with this structure:
{
  "documentType": "BILL_OF_LADING",
  "blNumber": "GLSL[PORT][YYYYMMDD][XXXX]",
  "blType": "ORIGINAL/SEAWAY/EXPRESS/TELEX",
  "blForm": "MASTER/HOUSE",
  "negotiable": true,
  "blStatus": "DRAFT",
  "issueDetails": {
    "placeOfIssue": "",
    "dateOfIssue": "",
    "numberOfOriginals": 3,
    "signedAs": "ORIGINAL"
  },
  "parties": {
    "shipper": {
      "name": "",
      "address": {
        "line1": "",
        "line2": "",
        "line3": "",
        "city": "",
        "state": "",
        "country": "",
        "postalCode": ""
      },
      "phone": "",
      "email": "",
      "reference": ""
    },
    "consignee": {
      "name": "",
      "address": {
        "line1": "",
        "line2": "",
        "line3": "",
        "city": "",
        "state": "",
        "country": "",
        "postalCode": ""
      },
      "toOrder": false,
      "toOrderOf": "",
      "orderEndorsement": ""
    },
    "notifyParty": {
      "primary": {
        "name": "",
        "address": {
          "line1": "",
          "line2": "",
          "line3": "",
          "city": "",
          "state": "",
          "country": "",
          "postalCode": ""
        },
        "phone": "",
        "email": ""
      },
      "secondary": {
        "name": "",
        "address": {
          "line1": "",
          "line2": ""
        }
      },
      "alsoNotify": []
    }
  },
  "voyage": {
    "preCarriageBy": "",
    "placeOfReceipt": {
      "location": "",
      "date": ""
    },
    "oceanVessel": "",
    "voyageNumber": "",
    "flag": "",
    "portOfLoading": {
      "port": "",
      "code": "",
      "terminal": "",
      "berth": ""
    },
    "portOfDischarge": {
      "port": "",
      "code": "",
      "terminal": "",
      "berth": ""
    },
    "placeOfDelivery": {
      "location": "",
      "code": ""
    },
    "finalDestination": "",
    "onwardInlandRouting": "",
    "transshipmentPort": "",
    "serviceContract": ""
  },
  "cargo": {
    "marksAndNumbers": [
      {
        "mark": "[CONSIGNEE_SHORT]",
        "poNumber": "",
        "destination": "",
        "packageNumbers": "1-X"
      }
    ],
    "numberOfPackages": {
      "quantity": 0,
      "type": "CARTONS/PALLETS/CRATES",
      "description": "X PACKAGES"
    },
    "descriptionOfGoods": {
      "description": "",
      "details": [
        "FREIGHT PREPAID/COLLECT",
        "SHIPPED ON BOARD",
        ""
      ],
      "additionalDescription": [],
      "hsCode": [],
      "ncm": ""
    },
    "weight": {
      "gross": 0,
      "net": 0,
      "unit": "KGS",
      "verified": false
    },
    "measurement": {
      "volume": 0,
      "unit": "CBM"
    },
    "declaredValue": {
      "forCarriage": "",
      "forCustoms": "",
      "currency": ""
    },
    "containerMode": "FCL/FCL (FULL CONTAINER LOAD)",
    "containers": [
      {
        "containerNumber": "",
        "sealNumber": [],
        "size": "20'/40'/40'HC",
        "type": "GP/HC/RF/OT/FR/TK/PL",
        "ownership": "COC/SOC",
        "packages": 0,
        "weight": 0,
        "cbm": 0,
        "vgm": {
          "weight": 0,
          "method": "METHOD 1/METHOD 2",
          "authorizedPerson": "",
          "verificationDate": ""
        },
        "packingStatus": "FCL/LCL",
        "loadStatus": "FULL/PARTIAL"
      }
    ],
    "commodity": {
      "code": "",
      "description": ""
    },
    "dangerousGoods": {
      "isDangerous": false,
      "unNumber": "",
      "class": "",
      "packingGroup": "",
      "flashpoint": "",
      "ems": "",
      "mfag": "",
      "marinePollutant": false
    },
    "reefer": {
      "isReefer": false,
      "setTemperature": "",
      "ventilation": "",
      "humidity": "",
      "genset": false
    }
  },
  "freight": {
    "paymentTerms": "PREPAID/COLLECT",
    "payableAt": "",
    "prepaidAt": "",
    "datePrePaid": "",
    "charges": {
      "oceanFreight": {
        "amount": "AS AGREED",
        "currency": "USD",
        "prepaid": 0,
        "collect": 0
      },
      "bunkerAdjustment": {
        "amount": 0,
        "status": "PREPAID/COLLECT"
      },
      "currencyAdjustment": {
        "amount": 0,
        "status": "PREPAID/COLLECT"
      },
      "terminalHandling": {
        "origin": 0,
        "destination": 0
      },
      "documentation": 0,
      "other": []
    },
    "exchangeRate": 1.0,
    "totalPrepaid": 0,
    "totalCollect": 0
  },
  "dates": {
    "cargoReceiptDate": "",
    "loadedOnBoardDate": "",
    "issueDate": "",
    "departureDate": "",
    "expectedArrival": ""
  },
  "clauses": {
    "specialClauses": [],
    "shipperDeclaration": {
      "declared": "SHIPPER'S LOAD, STOW, WEIGHT AND COUNT",
      "text": "The shipper, consignee and holder of this bill of lading hereby expressly accept and agree to all printed, written or stamped provisions, exceptions and conditions of this Bill of Lading, including those on the back hereof."
    },
    "carrierClauses": [
      "SHIPPED, as far as ascertained by reasonable means of checking, in apparent good order and condition unless otherwise stated herein",
      "Subject to all terms and conditions as per Carrier's applicable Tariff",
      "ISPS Code Compliant Vessel and Terminal",
      "One original Bill of Lading must be surrendered duly endorsed in exchange for the goods or delivery order"
    ],
    "freightClause": "FREIGHT PREPAID/TO BE COLLECTED",
    "ladingClause": "CLEAN ON BOARD",
    "deliveryClause": "ONE ORIGINAL BILL OF LADING MUST BE SURRENDERED",
    "jurisdictionClause": "Any dispute arising under this Bill of Lading shall be decided in the country where the Carrier has his principal place of business",
    "paramountClause": "The Hague Rules contained in the International Convention for the Unification of certain rules relating to Bills of Lading, dated Brussels the 25th August 1924 as enacted in the country of shipment shall apply to this contract."
  },
  "signature": {
    "signedFor": "GLOBAL LOGISTICS SOLUTIONS LTD",
    "signedBy": "AS CARRIER/AS AGENTS FOR THE CARRIER",
    "carrierName": "",
    "masterName": "MASTER",
    "agentName": "",
    "authorizedSignatory": "_____________________",
    "signatureDate": "",
    "signaturePlace": "",
    "stamp": "[COMPANY STAMP]"
  },
  "additionalInfo": {
    "moveType": "PORT-TO-PORT/DOOR-TO-PORT/PORT-TO-DOOR/DOOR-TO-DOOR",
    "serviceType": "CY-CY/CY-CFS/CFS-CY/CFS-CFS",
    "releaseType": "ORIGINAL/TELEX/SEAWAY",
    "equipmentHandover": "",
    "bookingNumber": "",
    "exportReference": "",
    "forwardersReference": "",
    "exportLicense": "",
    "aesItn": "",
    "domesticRouting": "",
    "pierLocation": "",
    "consolidation": "DIRECT/CONSOLE",
    "remarks": []
  },
  "backPageClauses": {
    "definitions": true,
    "carrierResponsibilities": true,
    "shipperResponsibilities": true,
    "freightAndCharges": true,
    "lien": true,
    "optionalStowage": true,
    "methodsAndRouteOfTransportation": true,
    "transshipment": true,
    "matterAffectingConditionOfGoods": true,
    "descriptionOfGoods": true,
    "shipperPackedContainers": true,
    "inspection": true,
    "delivery": true,
    "fcl": true,
    "notice": true,
    "generalAverage": true,
    "bothToBlame": true,
    "limitation": true,
    "adValorem": true,
    "rust": true,
    "jurisdiction": true
  },
  "systemInfo": {
    "version": "1.0",
    "template": "STANDARD_OCEAN_BILL",
    "generatedDate": "",
    "lastModified": "",
    "status": "DRAFT"
  },
  "validationFlags": [],
  "assumptions": [],
  "notes": []
}

Generate professional B/L with complete maritime shipping terms. Ensure compliance with international shipping regulations and Hague-Visby Rules.
`;