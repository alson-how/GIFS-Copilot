import express from "express";
import fs from "node:fs";
import path from "node:path";
import dayjs from "dayjs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const router = express.Router();

// Adjust if you store the template elsewhere:
const TEMPLATE_PATH = process.env.K2_TEMPLATE_PATH || path.join(process.cwd(), "Kastam No.2.pdf");

// --------- Coordinate helpers ---------
/**
 * Coordinate system: pdf-lib's origin is bottom-left.
 * We’ll define all positions from the TOP-LEFT for easier mental mapping,
 * then convert using page.getHeight().
 */
function tl(page, xFromLeft, yFromTop) {
  return { x: xFromLeft, y: page.getHeight() - yFromTop };
}
function drawText(page, text, x, y, opts = {}) {
  const { size = 9, font, color = rgb(0,0,0), maxWidth } = opts;
  if (!maxWidth) {
    page.drawText(String(text ?? ""), { x, y, size, font, color });
    return;
  }
  // simple wrap
  const words = String(text ?? "").split(/\s+/);
  let line = "", yy = y;
  const lh = size + 2;
  for (const w of words) {
    const t = line ? line + " " + w : w;
    const tw = font.widthOfTextAtSize(t, size);
    if (tw > maxWidth) {
      page.drawText(line, { x, y: yy, size, font, color });
      yy -= lh;
      line = w;
    } else line = t;
  }
  if (line) page.drawText(line, { x, y: yy, size, font, color });
}

function markCheckbox(page, x, y) {
  // small “X” mark
  page.drawLine({ start: {x:x-3, y:y-3}, end: {x:x+3, y:y+3}, thickness: 1, color: rgb(0,0,0) });
  page.drawLine({ start: {x:x-3, y:y+3}, end: {x:x+3, y:y-3}, thickness: 1, color: rgb(0,0,0) });
}

// --------- Coordinates map (tune with /calibrate grid) ---------
// NOTE: Values below are *sensible defaults* for an A4 scan; fine-tune on your file using /api/k2/calibrate
const coord = {
  // Top switches: Export / Local (tick area)
  exportMark: { x: 110, y: 110 },     // “Eksport / Export”
  localMark:  { x: 210, y: 110 },     // “Tempatan / Local”

  // Section 1: Consignor/Exporter
  consignor_name_addr: { x: 40, y: 150, w: 260 },
  consignor_exporter_code: { x: 360, y: 150, w: 100 },
  consignor_sales_tax_reg: { x: 360, y: 170, w: 100 },
  consignor_reg_no: { x: 360, y: 190, w: 100 },
  official_receipt_dt: { x: 360, y: 210, w: 100 },
  official_station: { x: 360, y: 230, w: 75 },
  official_station_code: { x: 450, y: 230, w: 60 },

  // Section 2: Consignee
  consignee_name_addr: { x: 40, y: 260, w: 260 },
  consignee_sales_tax_reg: { x: 360, y: 260, w: 150 },

  // Section 3: Agent
  agent_name_addr: { x: 40, y: 305, w: 260 },
  agent_code: { x: 360, y: 305, w: 100 },
  agent_service_tax_reg: { x: 360, y: 325, w: 150 },

  // Section 4: Mode of transport check boxes (Sea/Rail/Road/Air/Others)
  mode_sea:  { x: 120, y: 360 },
  mode_rail: { x: 210, y: 360 },
  mode_road: { x: 300, y: 360 },
  mode_air:  { x: 390, y: 360 },
  mode_oth:  { x: 480, y: 360 },

  // 5–10
  export_date: { x: 120, y: 385 },
  vessel_flight_vehicle: { x: 260, y: 385, w: 240 },

  special_treatment: { x: 120, y: 410, w: 160 },
  exemption_ref: { x: 320, y: 410, w: 180 },

  sta_yes: { x: 120, y: 435 }, sta_no: { x: 170, y: 435 },
  export_permit_no: { x: 260, y: 435, w: 150 },
  export_permit_expiry: { x: 430, y: 435, w: 70 },

  kpw_no: { x: 260, y: 455, w: 150 },
  kpw_expiry: { x: 430, y: 455, w: 70 },

  // 11–15 (countries & currency)
  origin_country: { x: 120, y: 485, w: 160 },
  origin_country_code: { x: 300, y: 485, w: 60 },
  final_dest_country: { x: 380, y: 485, w: 160 },
  final_dest_country_code: { x: 560, y: 485, w: 60 },

  currency: { x: 120, y: 505, w: 120 },
  currency_code: { x: 260, y: 505, w: 60 },
  amount_received: { x: 380, y: 505, w: 160 },

  // 20–27, ports, payment, weights, etc.
  exchange_rate_rm: { x: 120, y: 535, w: 80 },
  equivalent_rm: { x: 240, y: 535, w: 80 },
  insurance_rm: { x: 360, y: 535, w: 80 },
  freight_rm: { x: 480, y: 535, w: 80 },

  port_export: { x: 120, y: 555, w: 160 },
  port_export_code: { x: 300, y: 555, w: 60 },
  port_discharge: { x: 380, y: 555, w: 160 },
  port_discharge_code: { x: 560, y: 555, w: 60 },

  via_tranship_code: { x: 120, y: 575, w: 120 },

  payment_from_country: { x: 320, y: 575, w: 160 },
  payment_from_country_code: { x: 520, y: 575, w: 60 },

  gross_weight_kg: { x: 120, y: 595, w: 120 },
  measurement_m3: { x: 280, y: 595, w: 120 },
  fob_value_rm: { x: 440, y: 595, w: 120 },

  marks_and_nos: { x: 120, y: 620, w: 440 },

  // Items table (29–45) region top-left & column widths
  items: {
    topY: 650,       // first row Y from top
    rowH: 16,
    leftX: 40,
    cols: [
      { key: "no", w: 22 },
      { key: "packagesNoAndType", w: 90 },
      { key: "description", w: 130 },
      { key: "tariffCode", w: 70 },
      { key: "unit", w: 35 },
      { key: "invoiceNo", w: 70 },
      { key: "quantityActual", w: 55 },
      { key: "unitValueFOB", w: 70 },
      { key: "lineTotal", w: 75 },
      { key: "exportDutyRate", w: 40 },
      { key: "exportDutyAmount", w: 60 },
      { key: "salesTaxRate", w: 40 },
      { key: "salesTaxAmount", w: 60 },
      { key: "otherDutiesType", w: 40 },
      { key: "otherDutiesRate", w: 40 },
      { key: "otherDutiesAmount", w: 60 }
    ]
  },

  // Totals (46–50) + Others
  total_value: { x: 120, y: 760, w: 120 },
  total_export_duty: { x: 260, y: 760, w: 120 },
  total_sales_tax: { x: 400, y: 760, w: 120 },
  total_other_duties: { x: 120, y: 780, w: 120 }, // adjust
  total_duty_tax_payable: { x: 260, y: 780, w: 120 },

  other_charges: { x: 400, y: 780, w: 120 },
  total_amount_payable: { x: 520, y: 780, w: 120 },

  // Certification (51–54)
  cert_name: { x: 120, y: 820, w: 180 },
  cert_id: { x: 340, y: 820, w: 160 },
  cert_designation: { x: 120, y: 840, w: 180 },
  cert_date: { x: 340, y: 840, w: 160 },

  sign_x: { x: 520, y: 860 }, // where signature line appears (optional)
};

// --------- main render ---------
router.post("/render", async (req, res) => {
  try {
    const input = req.body; // { exportType, modeOfTransport, form, items, totals, otherChargesRM }
    if (!fs.existsSync(TEMPLATE_PATH)) throw new Error("K2 template not found at " + TEMPLATE_PATH);

    const bytes = fs.readFileSync(TEMPLATE_PATH);
    const pdfDoc = await PDFDocument.load(bytes);
    const page = pdfDoc.getPage(0);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const size = 9;

    // 0) Export/Local mark
    markCheckbox(page, ...Object.values(tl(page, ...(input.exportType === "Export" ? [coord.exportMark.x, coord.exportMark.y] : [coord.localMark.x, coord.localMark.y]))));

    // 1) Consignor
    draw(page, input.form?.consignor?.nameAddress, coord.consignor_name_addr, { font, size });
    draw(page, input.form?.consignor?.exporterCode, coord.consignor_exporter_code, { font, size });
    draw(page, input.form?.consignor?.salesTaxRegNo, coord.consignor_sales_tax_reg, { font, size });
    draw(page, input.form?.consignor?.regNo, coord.consignor_reg_no, { font, size });
    draw(page, input.form?.consignor?.official?.receiptDateTime, coord.official_receipt_dt, { font, size });
    draw(page, input.form?.consignor?.official?.station, coord.official_station, { font, size });
    draw(page, input.form?.consignor?.official?.stationCode, coord.official_station_code, { font, size });

    // 2) Consignee
    draw(page, input.form?.consignee?.nameAddress, coord.consignee_name_addr, { font, size });
    draw(page, input.form?.consignee?.salesTaxRegNo, coord.consignee_sales_tax_reg, { font, size });

    // 3) Agent
    draw(page, input.form?.agent?.nameAddress, coord.agent_name_addr, { font, size });
    draw(page, input.form?.agent?.agentCode, coord.agent_code, { font, size });
    draw(page, input.form?.agent?.serviceTaxRegNo, coord.agent_service_tax_reg, { font, size });

    // 4) Mode
    const mode = (input.modeOfTransport || "").toLowerCase();
    const mm = mode === "sea" ? coord.mode_sea : mode === "rail" ? coord.mode_rail : mode === "road" ? coord.mode_road : mode === "air" ? coord.mode_air : coord.mode_oth;
    markCheckbox(page, ...Object.values(tl(page, mm.x, mm.y)));

    // 5–10
    draw(page, input.form?.exportDate, coord.export_date, { font, size });
    draw(page, input.form?.vesselFlightVehicle, coord.vessel_flight_vehicle, { font, size });

    draw(page, input.form?.specialTreatment, coord.special_treatment, { font, size });
    draw(page, input.form?.exemptionApprovalRef, coord.exemption_ref, { font, size });

    const sta = String(input.form?.sta || "No").toLowerCase() === "yes" ? coord.sta_yes : coord.sta_no;
    markCheckbox(page, ...Object.values(tl(page, sta.x, sta.y)));

    draw(page, input.form?.exportPermitNo, coord.export_permit_no, { font, size });
    draw(page, input.form?.exportPermitExpiry, coord.export_permit_expiry, { font, size });

    draw(page, input.form?.kpwNo, coord.kpw_no, { font, size });
    draw(page, input.form?.kpwExpiry, coord.kpw_expiry, { font, size });

    // 11–15
    draw(page, input.form?.originCountry, coord.origin_country, { font, size });
    draw(page, input.form?.originCountryCode, coord.origin_country_code, { font, size });
    draw(page, input.form?.finalDestCountry, coord.final_dest_country, { font, size });
    draw(page, input.form?.finalDestCountryCode, coord.final_dest_country_code, { font, size });

    draw(page, input.form?.currency, coord.currency, { font, size });
    draw(page, input.form?.currencyCode, coord.currency_code, { font, size });
    draw(page, input.form?.amountReceived, coord.amount_received, { font, size });

    // 20–27
    draw(page, input.form?.exchangeRateRM, coord.exchange_rate_rm, { font, size });
    draw(page, input.form?.equivalentRM, coord.equivalent_rm, { font, size });
    draw(page, input.form?.insuranceRM, coord.insurance_rm, { font, size });
    draw(page, input.form?.freightRM, coord.freight_rm, { font, size });

    draw(page, input.form?.portExport, coord.port_export, { font, size });
    draw(page, input.form?.portExportCode, coord.port_export_code, { font, size });
    draw(page, input.form?.portDischarge, coord.port_discharge, { font, size });
    draw(page, input.form?.portDischargeCode, coord.port_discharge_code, { font, size });

    draw(page, input.form?.transhipmentViaCode, coord.via_tranship_code, { font, size });
    draw(page, input.form?.paymentFromCountry, coord.payment_from_country, { font, size });
    draw(page, input.form?.paymentFromCountryCode, coord.payment_from_country_code, { font, size });

    draw(page, input.form?.grossWeightKg, coord.gross_weight_kg, { font, size });
    draw(page, input.form?.measurementM3, coord.measurement_m3, { font, size });
    draw(page, input.totals?.totalValue ?? "", coord.fob_value_rm, { font, size });

    draw(page, input.form?.marksAndNos, coord.marks_and_nos, { font, size, maxWidth: coord.marks_and_nos.w });

    // Items 29–45
    const itConf = coord.items;
    let curX = itConf.leftX, curYTop = itConf.topY;
    // Convert TL to BL
    let { x: baseX, y: baseY } = tl(page, itConf.leftX, itConf.topY);
    const colsX = [];
    let accX = baseX;
    for (const c of itConf.cols) {
      colsX.push({ key: c.key, x: accX, w: c.w });
      accX += c.w;
    }
    const maxRows = 10; // fit per page (tune)
    const items = (input.items || []).slice(0, maxRows);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const yy = baseY - i * itConf.rowH;
      const lineTotal = (num(it.quantityActual) * num(it.unitValueFOB)) || 0;

      for (const col of colsX) {
        const v = col.key === "lineTotal" ? fmt(lineTotal)
          : (it[col.key] ?? "");
        page.drawText(String(v), {
          x: col.x + 2, y: yy, size, font, color: rgb(0,0,0)
        });
      }
    }

    // Totals 46–50 + Other charges
    draw(page, fmt(input.totals?.totalValue), coord.total_value, { font, size });
    draw(page, fmt(input.totals?.exportDuty), coord.total_export_duty, { font, size });
    draw(page, fmt(input.totals?.salesTax), coord.total_sales_tax, { font, size });
    draw(page, fmt(input.totals?.otherDuties), coord.total_other_duties, { font, size });
    draw(page, fmt(input.totals?.dutyTaxPayable), coord.total_duty_tax_payable, { font, size });
    draw(page, fmt(input.otherChargesRM), coord.other_charges, { font, size });
    draw(page, fmt(input.totals?.totalAmountPayable), coord.total_amount_payable, { font, size });

    // Certification 51–54
    draw(page, input.form?.certification?.declarantName, coord.cert_name, { font, size });
    draw(page, input.form?.certification?.idPassport, coord.cert_id, { font, size });
    draw(page, input.form?.certification?.designation, coord.cert_designation, { font, size });
    draw(page, input.form?.certification?.date, coord.cert_date, { font, size });

    // Output
    const out = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Kastam No.2 (filled).pdf"`);
    return res.send(Buffer.from(out));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// --------- Calibration grid: overlay grid + axes to tune coordinates ---------
router.post("/calibrate", async (_req, res) => {
  try {
    const bytes = fs.readFileSync(TEMPLATE_PATH);
    const pdfDoc = await PDFDocument.load(bytes);
    const page = pdfDoc.getPage(0);
    const font = await pdfDoc.embedFont(StandardFonts.Courier);
    const color = rgb(0.2, 0.2, 0.2);
    const step = 40;

    // vertical lines
    for (let x=0; x<page.getWidth(); x+=step) {
      page.drawLine({ start:{x, y:0}, end:{x, y:page.getHeight()}, color, thickness: 0.3 });
      page.drawText(String(x), { x: x+2, y: page.getHeight()-12, size: 7, font, color });
    }
    // horizontal lines
    for (let y=0; y<page.getHeight(); y+=step) {
      page.drawLine({ start:{x:0, y}, end:{x:page.getWidth(), y}, color, thickness: 0.3 });
      page.drawText(String(y), { x: 2, y: y+2, size: 7, font, color });
    }

    const out = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="K2_calibration_grid.pdf"`);
    return res.send(Buffer.from(out));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --------- tiny wrappers ---------
function draw(page, value, spot, { font, size }) {
  if (!spot) return;
  const { x, y } = tl(page, spot.x, spot.y);
  drawText(page, value ?? "", x, y, { font, size, maxWidth: spot.w });
}
function num(v){ const n = +String(v||"").replace(/,/g,""); return Number.isFinite(n)?n:0; }
function fmt(n){ const v = num(n); return v ? new Intl.NumberFormat("ms-MY",{minimumFractionDigits:2, maximumFractionDigits:2}).format(v) : ""; }

export default router;
