import React, { useMemo, useState } from "react";

/**
 * Royal Malaysian Customs — Declaration of Goods to be Exported (Kastam No. 2)
 * Simple React implementation that mirrors the PDF structure as a bilingual (BM/EN) form.
 *
 * Notes
 * - Uses plain React + Tailwind classes for styling (no external UI libs required).
 * - Includes dynamic Items table (add/remove rows) and running totals.
 * - Prints cleanly (File → Print) and can export current state as JSON in the side panel.
 * - Labels follow the PDF as closely as practical while staying web‑friendly.
 * - This is a UI scaffold; you can wire up validation, persistence, and APIs as needed.
 */

export default function CustomsExportDeclarationForm() {
  const [exportType, setExportType] = useState("Export"); // Export / Local
  const [modeOfTransport, setModeOfTransport] = useState("Sea");
  const [otherChargesRM, setOtherChargesRM] = useState(0);

  const [form, setForm] = useState({
    // 1. Consignor / Exporter
    consignor: {
      nameAddress: "",
      exporterCode: "",
      salesTaxRegNo: "",
      regNo: "",
      official: {
        receiptDateTime: "",
        station: "",
        stationCode: "",
      },
    },

    // 2. Consignee / Importer
    consignee: {
      nameAddress: "",
      salesTaxRegNo: "",
    },

    // 3. Authorized Agent
    agent: {
      nameAddress: "",
      agentCode: "",
      serviceTaxRegNo: "",
    },

    // 4–10: Export context
    exportDate: "",
    vesselFlightVehicle: "",

    specialTreatment: "", // 6
    exemptionApprovalRef: "", // 7
    sta: "No", // 8 — Security/Strategic Trade Act (STA) Yes/No
    exportPermitNo: "", // 9
    exportPermitExpiry: "",
    kpwNo: "", // 10 K.P.W.X. No.
    kpwExpiry: "",

    // 11–15: Countries & Currency
    originCountry: "",
    originCountryCode: "",
    finalDestCountry: "",
    finalDestCountryCode: "",
    currency: "",
    currencyCode: "",
    amountReceived: "", // 14

    // Ports, payment & rates (20–27)
    exchangeRateRM: "",
    equivalentRM: "",
    insuranceRM: "",
    freightRM: "",

    portExport: "",
    portExportCode: "",
    portDischarge: "",
    portDischargeCode: "",

    transhipmentViaCode: "",

    paymentFromCountry: "",
    paymentFromCountryCode: "",

    grossWeightKg: "",
    measurementM3: "",

    marksAndNos: "",

    // Footer/admin
    certification: {
      declarantName: "",
      idPassport: "",
      designation: "",
      date: "",
      signature: "",
    },
  });

  const [items, setItems] = useState([blankItem(1)]);
  const [loading, setLoading] = useState(false);

  const totals = useMemo(() => {
    const t = items.reduce(
      (acc, it) => {
        const q = toNum(it.quantityActual);
        const unit = toNum(it.unitValueFOB);
        const totalValue = q * unit || 0;
        const exportDuty = toNum(it.exportDutyAmount);
        const salesTax = toNum(it.salesTaxAmount);
        const otherDuties = toNum(it.otherDutiesAmount);

        acc.totalValue += totalValue;
        acc.exportDuty += exportDuty;
        acc.salesTax += salesTax;
        acc.otherDuties += otherDuties;
        return acc;
      },
      { totalValue: 0, exportDuty: 0, salesTax: 0, otherDuties: 0 }
    );
    t.dutyTaxPayable = t.exportDuty + t.salesTax + t.otherDuties;
    t.totalAmountPayable = t.dutyTaxPayable + toNum(otherChargesRM);
    return t;
  }, [items, otherChargesRM]);

  function update(path, value) {
    setForm((prev) => deepSet({ ...prev }, path, value));
  }

  function updateItem(index, field, value) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, blankItem(prev.length + 1)]);
  }

  function removeItem(i) {
    setItems((prev) => prev.filter((_, idx) => idx !== i).map((row, idx) => ({
      ...row,
      no: idx + 1,
    })));
  }

  async function onSubmit(e) {
    e.preventDefault();
    const payload = {
      exportType,
      modeOfTransport,
      form,
      items,
      totals,
      otherChargesRM,
      generatedAt: new Date().toISOString(),
    };
    
    try {
      setLoading(true);
      console.log("Kastam No.2 payload", payload);
      
      // Send to backend for PDF generation
      const response = await fetch('/api/k2/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        // Download the PDF
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Kastam_No2_Export_Declaration.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        alert("✅ K2 Form PDF generated and downloaded successfully!");
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error generating K2 PDF:', error);
      alert("❌ Error generating PDF: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6">
        <header className="mb-6 print:mb-2">
          <h1 className="text-2xl font-semibold text-slate-900">
            JABATAN KASTAM DIRAJA MALAYSIA / ROYAL MALAYSIAN CUSTOMS DEPARTMENT
          </h1>
          <p className="text-sm text-slate-600">
            PERAKUAN BARANG YANG DIEKSPORT / DECLARATION OF GOODS TO BE EXPORTED — Kastam No.2
          </p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <form onSubmit={onSubmit} className="xl:col-span-2 space-y-6 print:space-y-3">
            {/* Export / Local */}
            <Section title="Eksport / Tempatan — Export / Local">
              <div className="flex gap-4 items-center">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    className="accent-slate-900"
                    checked={exportType === "Export"}
                    onChange={() => setExportType("Export")}
                  />
                  <span>Eksport / Export</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    className="accent-slate-900"
                    checked={exportType === "Local"}
                    onChange={() => setExportType("Local")}
                  />
                  <span>Tempatan / Local</span>
                </label>
              </div>
            </Section>

            {/* 1. Consignor/Exporter */}
            <Section title="1. Konsainor/Pengeksport — Consignor/Exporter">
              <Grid cols={2}>
                <Field label="Nama & Alamat / Name & Address" colSpan={2}>
                  <textarea
                    className="input"
                    value={form.consignor.nameAddress}
                    onChange={(e) => update("consignor.nameAddress", e.target.value)}
                    rows={3}
                  />
                </Field>
                <Field label="Kod Pengeksport / Exporter Code">
                  <input
                    className="input"
                    value={form.consignor.exporterCode}
                    onChange={(e) => update("consignor.exporterCode", e.target.value)}
                  />
                </Field>
                <Field label="No. Pendaftaran Cukai Jualan / Sales Tax Reg. No.*">
                  <input
                    className="input"
                    value={form.consignor.salesTaxRegNo}
                    onChange={(e) => update("consignor.salesTaxRegNo", e.target.value)}
                  />
                </Field>
                <Field label="No. Pendaftaran / Registration No.">
                  <input
                    className="input"
                    value={form.consignor.regNo}
                    onChange={(e) => update("consignor.regNo", e.target.value)}
                  />
                </Field>
                <Field label="Tarikh & Waktu Terima / Date & Time of Receipt">
                  <input
                    type="datetime-local"
                    className="input"
                    value={form.consignor.official.receiptDateTime}
                    onChange={(e) => update("consignor.official.receiptDateTime", e.target.value)}
                  />
                </Field>
                <Field label="Stesen / Station">
                  <input
                    className="input"
                    value={form.consignor.official.station}
                    onChange={(e) => update("consignor.official.station", e.target.value)}
                  />
                </Field>
                <Field label="Kod / Code">
                  <input
                    className="input"
                    value={form.consignor.official.stationCode}
                    onChange={(e) => update("consignor.official.stationCode", e.target.value)}
                  />
                </Field>
              </Grid>
            </Section>

            {/* 2. Consignee/Importer */}
            <Section title="2. Konsaini/Pengimport — Consignee/Importer">
              <Grid cols={2}>
                <Field label="Nama & Alamat / Name & Address" colSpan={2}>
                  <textarea
                    className="input"
                    value={form.consignee.nameAddress}
                    onChange={(e) => update("consignee.nameAddress", e.target.value)}
                    rows={3}
                  />
                </Field>
                <Field label="No. Pendaftaran Cukai Jualan / Sales Tax Reg. No.*">
                  <input
                    className="input"
                    value={form.consignee.salesTaxRegNo}
                    onChange={(e) => update("consignee.salesTaxRegNo", e.target.value)}
                  />
                </Field>
              </Grid>
            </Section>

            {/* 3. Authorized Agent */}
            <Section title="3. Ejen Yang Diberikuasa — Authorized Agent">
              <Grid cols={2}>
                <Field label="Nama & Alamat / Name & Address" colSpan={2}>
                  <textarea
                    className="input"
                    value={form.agent.nameAddress}
                    onChange={(e) => update("agent.nameAddress", e.target.value)}
                    rows={3}
                  />
                </Field>
                <Field label="Kod Ejen / Agent Code">
                  <input
                    className="input"
                    value={form.agent.agentCode}
                    onChange={(e) => update("agent.agentCode", e.target.value)}
                  />
                </Field>
                <Field label="No. Pendaftaran Cukai Perkhidmatan / Service Tax Reg. No.*">
                  <input
                    className="input"
                    value={form.agent.serviceTaxRegNo}
                    onChange={(e) => update("agent.serviceTaxRegNo", e.target.value)}
                  />
                </Field>
              </Grid>
            </Section>

            {/* 4. Mode of Transport */}
            <Section title="4. Mod Pengangkutan — Mode of Transport">
              <div className="flex flex-wrap gap-4">
                {[
                  "Sea",
                  "Rail",
                  "Road",
                  "Air",
                  "Others",
                ].map((opt) => (
                  <label key={opt} className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      className="accent-slate-900"
                      checked={modeOfTransport === opt}
                      onChange={() => setModeOfTransport(opt)}
                    />
                    <span>{opt === "Sea" ? "Laut / Sea" : opt === "Rail" ? "Keretapi / Rail" : opt === "Road" ? "Jalan Raya / Road" : opt === "Air" ? "Udara / Air" : "Lain‑lain / Others"}</span>
                  </label>
                ))}
              </div>
            </Section>

            {/* 5–10 Key refs */}
            <Section title="5–10. Tarikh Eksport, Kapal/Kenderaan, Layanan Khas, Permits, K.P.W.X.">
              <Grid cols={3}>
                <Field label="Tarikh Eksport / Export Date">
                  <input
                    type="date"
                    className="input"
                    value={form.exportDate}
                    onChange={(e) => update("exportDate", e.target.value)}
                  />
                </Field>
                <Field label="No./Nama Kapal/Penerbangan/Kenderaan / Vessel/Flight/Vehicle" colSpan={2}>
                  <input
                    className="input"
                    value={form.vesselFlightVehicle}
                    onChange={(e) => update("vesselFlightVehicle", e.target.value)}
                  />
                </Field>

                <Field label="6. Layanan Khas / Special Treatment">
                  <input
                    className="input"
                    value={form.specialTreatment}
                    onChange={(e) => update("specialTreatment", e.target.value)}
                  />
                </Field>
                <Field label="7. No. Rujukan Kelulusan Pengecualian / Exemption Approval Ref. No.">
                  <input
                    className="input"
                    value={form.exemptionApprovalRef}
                    onChange={(e) => update("exemptionApprovalRef", e.target.value)}
                  />
                </Field>

                <Field label="8. STA">
                  <select
                    className="input"
                    value={form.sta}
                    onChange={(e) => update("sta", e.target.value)}
                  >
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </Field>

                <Field label="9. No. Permit Eksport / Export Permit No.">
                  <input
                    className="input"
                    value={form.exportPermitNo}
                    onChange={(e) => update("exportPermitNo", e.target.value)}
                  />
                </Field>
                <Field label="Tarikh Luput / Expiry Date">
                  <input
                    type="date"
                    className="input"
                    value={form.exportPermitExpiry}
                    onChange={(e) => update("exportPermitExpiry", e.target.value)}
                  />
                </Field>

                <Field label="10. No. K.P.W.X.">
                  <input
                    className="input"
                    value={form.kpwNo}
                    onChange={(e) => update("kpwNo", e.target.value)}
                  />
                </Field>
                <Field label="Tarikh Luput / Expiry Date">
                  <input
                    type="date"
                    className="input"
                    value={form.kpwExpiry}
                    onChange={(e) => update("kpwExpiry", e.target.value)}
                  />
                </Field>
              </Grid>
            </Section>

            {/* 11–15 Countries & currency */}
            <Section title="11–15. Negara Asal & Destinasi, Mata Wang & Amaun">
              <Grid cols={4}>
                <Field label="11. Negara Asal / Country of Origin">
                  <input
                    className="input"
                    value={form.originCountry}
                    onChange={(e) => update("originCountry", e.target.value)}
                  />
                </Field>
                <Field label="Kod / Code">
                  <input
                    className="input"
                    value={form.originCountryCode}
                    onChange={(e) => update("originCountryCode", e.target.value)}
                  />
                </Field>
                <Field label="12. Negara Destinasi Terakhir / Country of Final Destination">
                  <input
                    className="input"
                    value={form.finalDestCountry}
                    onChange={(e) => update("finalDestCountry", e.target.value)}
                  />
                </Field>
                <Field label="Kod / Code">
                  <input
                    className="input"
                    value={form.finalDestCountryCode}
                    onChange={(e) => update("finalDestCountryCode", e.target.value)}
                  />
                </Field>

                <Field label="13. Mata Wang / Currency">
                  <input
                    className="input"
                    value={form.currency}
                    onChange={(e) => update("currency", e.target.value)}
                  />
                </Field>
                <Field label="Kod / Code">
                  <input
                    className="input"
                    value={form.currencyCode}
                    onChange={(e) => update("currencyCode", e.target.value)}
                  />
                </Field>
                <Field label="14. Amaun telah diterima/akan diterima / Amount received/to be received">
                  <input
                    type="number"
                    className="input"
                    value={form.amountReceived}
                    onChange={(e) => update("amountReceived", e.target.value)}
                  />
                </Field>
              </Grid>
            </Section>

            {/* 20–27 Rates, ports, payment, weights */}
            <Section title="20–27. Kadar Pertukaran, Insurans, Pelabuhan, Bayaran, Berat & Ukuran">
              <Grid cols={4}>
                <Field label="20. Kadar Pertukaran / Exchange Rate (→ RM)">
                  <input
                    type="number"
                    className="input"
                    value={form.exchangeRateRM}
                    onChange={(e) => update("exchangeRateRM", e.target.value)}
                  />
                </Field>
                <Field label="21. Persamaan / Equivalent (RM)">
                  <input
                    type="number"
                    className="input"
                    value={form.equivalentRM}
                    onChange={(e) => update("equivalentRM", e.target.value)}
                  />
                </Field>
                <Field label="22. Insurans / Insurance (RM)">
                  <input
                    type="number"
                    className="input"
                    value={form.insuranceRM}
                    onChange={(e) => update("insuranceRM", e.target.value)}
                  />
                </Field>
                <Field label="24. Tambang Muatan / Freight (RM)">
                  <input
                    type="number"
                    className="input"
                    value={form.freightRM}
                    onChange={(e) => update("freightRM", e.target.value)}
                  />
                </Field>

                <Field label="7. Pelabuhan/Tempat Dieksport / Port/Place of Export">
                  <input
                    className="input"
                    value={form.portExport}
                    onChange={(e) => update("portExport", e.target.value)}
                  />
                </Field>
                <Field label="Kod / Code">
                  <input
                    className="input"
                    value={form.portExportCode}
                    onChange={(e) => update("portExportCode", e.target.value)}
                  />
                </Field>
                <Field label="8. Pelabuhan Pemunggahan / Port of Discharge">
                  <input
                    className="input"
                    value={form.portDischarge}
                    onChange={(e) => update("portDischarge", e.target.value)}
                  />
                </Field>
                <Field label="Kod / Code">
                  <input
                    className="input"
                    value={form.portDischargeCode}
                    onChange={(e) => update("portDischargeCode", e.target.value)}
                  />
                </Field>

                <Field label="9. Melalui (kargo pindah kapal sahaja) / Via (transhipment only) — Kod">
                  <input
                    className="input"
                    value={form.transhipmentViaCode}
                    onChange={(e) => update("transhipmentViaCode", e.target.value)}
                  />
                </Field>

                <Field label="23. Bayaran bagi barang diterima dari (Negara) / Payment for goods received from (Country)">
                  <input
                    className="input"
                    value={form.paymentFromCountry}
                    onChange={(e) => update("paymentFromCountry", e.target.value)}
                  />
                </Field>
                <Field label="Kod / Code">
                  <input
                    className="input"
                    value={form.paymentFromCountryCode}
                    onChange={(e) => update("paymentFromCountryCode", e.target.value)}
                  />
                </Field>

                <Field label="25. Berat Kasar / Gross Wt. (kg)">
                  <input
                    type="number"
                    className="input"
                    value={form.grossWeightKg}
                    onChange={(e) => update("grossWeightKg", e.target.value)}
                  />
                </Field>
                <Field label="26. Ukuran / Measurement (m³)">
                  <input
                    type="number"
                    className="input"
                    value={form.measurementM3}
                    onChange={(e) => update("measurementM3", e.target.value)}
                  />
                </Field>
              </Grid>

              <Field label="28. Tanda & No. / No. Kontena — Marks & Nos / Container No." colSpan={1}>
                <textarea
                  className="input"
                  value={form.marksAndNos}
                  onChange={(e) => update("marksAndNos", e.target.value)}
                  rows={2}
                />
              </Field>
            </Section>

            {/* 29–45 Items Table */}
            <Section title="29–45. Butiran Barang — Itemised Goods (Tarif, Kuantiti, Nilai, Cukai)">
              <div className="overflow-auto border rounded-lg">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <Th>No.</Th>
                      <Th>No. & Jenis Bungkusan / No. & Type of Packages</Th>
                      <Th>Perihal Barang / Description</Th>
                      <Th>32. Kod Tarif / Tariff Code</Th>
                      <Th>33. Unit</Th>
                      <Th>34. No. Invois</Th>
                      <Th>35. Kuantiti (Sebenar)</Th>
                      <Th>Nilai Unit FOB (RM)</Th>
                      <Th>38. Jumlah Nilai (RM)</Th>
                      <Th>39–40 Duti Eksport (Rate/Amount)</Th>
                      <Th>41–42 Cukai Jualan (Rate/Amount)</Th>
                      <Th>43–45 Cukai Lain (Type/Rate/Amount)</Th>
                      <Th></Th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => {
                      const q = toNum(it.quantityActual);
                      const unit = toNum(it.unitValueFOB);
                      const lineTotal = q * unit || 0;

                      return (
                        <tr key={i} className="border-t align-top">
                          <Td className="w-12 text-center">{it.no}</Td>

                          <Td>
                            <input
                              className="input input-sm"
                              value={it.packagesNoAndType}
                              onChange={(e) => updateItem(i, "packagesNoAndType", e.target.value)}
                            />
                          </Td>

                          <Td>
                            <textarea
                              className="input input-sm"
                              rows={2}
                              value={it.description}
                              onChange={(e) => updateItem(i, "description", e.target.value)}
                            />
                          </Td>

                          <Td>
                            <input
                              className="input input-sm"
                              value={it.tariffCode}
                              onChange={(e) => updateItem(i, "tariffCode", e.target.value)}
                            />
                          </Td>

                          <Td>
                            <input
                              className="input input-sm"
                              value={it.unit}
                              onChange={(e) => updateItem(i, "unit", e.target.value)}
                            />
                          </Td>

                          <Td>
                            <input
                              className="input input-sm"
                              value={it.invoiceNo}
                              onChange={(e) => updateItem(i, "invoiceNo", e.target.value)}
                            />
                          </Td>

                          <Td>
                            <input
                              type="number"
                              className="input input-sm"
                              value={it.quantityActual}
                              onChange={(e) => updateItem(i, "quantityActual", e.target.value)}
                            />
                          </Td>

                          <Td>
                            <input
                              type="number"
                              className="input input-sm"
                              step="0.01"
                              value={it.unitValueFOB}
                              onChange={(e) => updateItem(i, "unitValueFOB", e.target.value)}
                            />
                          </Td>

                          <Td>
                            <div className="input input-sm bg-slate-50 select-none">
                              {fmt(lineTotal)}
                            </div>
                          </Td>

                          <Td>
                            <div className="flex gap-2">
                              <input
                                placeholder="Rate %"
                                type="number"
                                className="input input-sm w-20"
                                value={it.exportDutyRate}
                                onChange={(e) => updateItem(i, "exportDutyRate", e.target.value)}
                              />
                              <input
                                placeholder="Amount RM"
                                type="number"
                                className="input input-sm w-28"
                                value={it.exportDutyAmount}
                                onChange={(e) => updateItem(i, "exportDutyAmount", e.target.value)}
                              />
                            </div>
                          </Td>

                          <Td>
                            <div className="flex gap-2">
                              <input
                                placeholder="Rate %"
                                type="number"
                                className="input input-sm w-20"
                                value={it.salesTaxRate}
                                onChange={(e) => updateItem(i, "salesTaxRate", e.target.value)}
                              />
                              <input
                                placeholder="Amount RM"
                                type="number"
                                className="input input-sm w-28"
                                value={it.salesTaxAmount}
                                onChange={(e) => updateItem(i, "salesTaxAmount", e.target.value)}
                              />
                            </div>
                          </Td>

                          <Td>
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                placeholder="Type"
                                className="input input-sm"
                                value={it.otherDutiesType}
                                onChange={(e) => updateItem(i, "otherDutiesType", e.target.value)}
                              />
                              <input
                                placeholder="Rate %"
                                type="number"
                                className="input input-sm"
                                value={it.otherDutiesRate}
                                onChange={(e) => updateItem(i, "otherDutiesRate", e.target.value)}
                              />
                              <input
                                placeholder="Amount RM"
                                type="number"
                                className="input input-sm"
                                value={it.otherDutiesAmount}
                                onChange={(e) => updateItem(i, "otherDutiesAmount", e.target.value)}
                              />
                            </div>
                          </Td>

                          <Td className="w-10 text-right">
                            <button
                              type="button"
                              className="text-red-600 hover:underline"
                              onClick={() => removeItem(i)}
                              aria-label={`Remove row ${i + 1}`}
                            >
                              −
                            </button>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center mt-3">
                <button type="button" className="btn" onClick={addItem}>
                  + Tambah Baris / Add Row
                </button>
                <div className="text-sm text-slate-600">Auto‑total for each line = Quantity × Unit FOB Value</div>
              </div>
            </Section>

            {/* 46–50 Totals */}
            <Section title="46–50. Jumlah / Totals (RM)">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Summary label="46. Jumlah (Nilai) / Total Value" value={totals.totalValue} />
                <Summary label="47. Jumlah Duti Eksport" value={totals.exportDuty} />
                <Summary label="48. Jumlah Cukai Jualan" value={totals.salesTax} />
                <Summary label="49. Jumlah Cukai Lain" value={totals.otherDuties} />
                <Summary label="50. Jumlah Duti/Cukai Kena Dibayar" value={totals.dutyTaxPayable} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <Field label="Caj Lain / Other Charges (RM)">
                  <input
                    type="number"
                    className="input"
                    value={otherChargesRM}
                    onChange={(e) => setOtherChargesRM(toNum(e.target.value))}
                  />
                </Field>
                <Summary label="Jumlah Amaun Kena Dibayar / Total Amount Payable" value={totals.totalAmountPayable} />
              </div>
            </Section>

            {/* 51–54 Certification */}
            <Section title="51–54. Pengesahan / Certification">
              <Grid cols={2}>
                <Field label="51. Nama / Name">
                  <input
                    className="input"
                    value={form.certification.declarantName}
                    onChange={(e) => update("certification.declarantName", e.target.value)}
                  />
                </Field>
                <Field label="52. No. Kad Pengenalan / Pasport — Identification Card / Passport">
                  <input
                    className="input"
                    value={form.certification.idPassport}
                    onChange={(e) => update("certification.idPassport", e.target.value)}
                  />
                </Field>
                <Field label="53. Jawatan / Designation">
                  <input
                    className="input"
                    value={form.certification.designation}
                    onChange={(e) => update("certification.designation", e.target.value)}
                  />
                </Field>
                <Field label="Tarikh / Date">
                  <input
                    type="date"
                    className="input"
                    value={form.certification.date}
                    onChange={(e) => update("certification.date", e.target.value)}
                  />
                </Field>
              </Grid>
              <p className="text-xs text-slate-600 mt-2">
                54. Saya memperakui perakuan ini benar dan lengkap / I hereby certify that this declaration is true and complete.
              </p>
            </Section>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 justify-end pt-2 print:hidden">
              <button type="button" className="btn-outline" onClick={() => window.print()}>Cetak / Print</button>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? '🔄 Generating PDF...' : '📄 Generate K2 PDF'}
              </button>
            </div>

            {/* Conditions (static text from the form) */}
            <Section title="Syarat Perakuan Eksport / Conditions for Declaration of Export">
              <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700">
                <li>
                  Pengeksport atau ejen yang dilantik hendaklah mengemukakan borang yang telah dilengkapkan kepada pegawai kastam yang hak bagi tujuan pengeksportan barang.
                </li>
                <li>
                  Pengeksport atau ejen yang dilantik hendaklah mengisi butiran 1 hingga 54.
                </li>
                <li>
                  Dokumen berikut hendaklah disertakan bersama borang ini: (a) permit/kebenaran/kelulusan agensi lain jika berkaitan; (b) master bill of lading dan master airway bill (house bill hendaklah dikemukakan bersama master bill);
                  (c) invois; (d) dokumen lain seperti dikehendaki pegawai kastam yang hak.
                </li>
                <li>
                  Barang tidak boleh dikeluarkan daripada kawalan kastam sebelum kelulusan diberi oleh pegawai kastam yang hak.
                </li>
                <li>
                  Tandakan sama ada barang untuk tujuan eksport atau tempatan.
                </li>
                <li>
                  Pengeksport atau ejen bertanggungjawab atas kesahihan maklumat dalam borang ini dan dokumen dilampirkan.
                </li>
              </ol>
              <hr className="my-3" />
              <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700">
                <li>
                  The exporter or appointed agent shall submit a completed form to the proper officer of customs for the purposes of exportation of goods.
                </li>
                <li>
                  The exporter or appointed agent shall fill in the details in items 1 to 54.
                </li>
                <li>
                  The following documents shall be attached: (a) permit/permission/approval from other agency if applicable; (b) master bill of lading and master airway bill (house bill to be submitted together with master bill); (c) invoice; (d) other documents as required by the proper officer of customs.
                </li>
                <li>
                  Goods shall not be removed from customs control before approval is given by the proper officer of customs.
                </li>
                <li>
                  Mark whether the goods are for the purpose of export or local.
                </li>
                <li>
                  The exporter or appointed agent shall be liable for the validity of the information provided in the form and attached documents.
                </li>
              </ol>
            </Section>
          </form>

          {/* Side panel: live JSON and quick tips */}
          <aside className="xl:col-span-1 space-y-6 print:hidden">
            <div className="card">
              <h3 className="card-title">Live JSON Preview</h3>
              <pre className="mt-2 max-h-[50vh] overflow-auto text-xs bg-slate-950 text-slate-50 p-3 rounded">
{JSON.stringify({ exportType, modeOfTransport, form, items, totals, otherChargesRM }, null, 2)}
              </pre>
            </div>

            <div className="card">
              <h3 className="card-title">Usage Tips</h3>
              <ul className="list-disc pl-5 text-sm text-slate-700 space-y-2">
                <li>Use "Cetak / Print" for a print‑friendly export.</li>
                <li>Add or remove item rows with the +/- controls; line total auto‑calculates.</li>
                <li>Wire up your back‑end by handling the submit payload in <code>onSubmit</code>.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* Tailwind utility presets for consistent inputs */}
      <style>{`
        .input { @apply w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400; }
        .input-sm { @apply px-2 py-1 text-xs rounded-lg; }
        .btn { @apply inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-800 active:scale-[.98]; }
        .btn-outline { @apply inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 active:scale-[.98]; }
        .card { @apply rounded-2xl border border-slate-200 bg-white p-4 shadow-sm; }
        .card-title { @apply text-sm font-semibold text-slate-900; }
        @media print { .print\\:hidden { display: none !important; } .print\\:mb-2 { margin-bottom: .5rem !important; } }
      `}</style>
    </div>
  );
}

// Helpers & tiny UI primitives
function Th({ children }) {
  return <th className="text-left px-3 py-2 text-xs font-semibold">{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={"px-3 py-2 " + className}>{children}</td>;
}
function Section({ title, children }) {
  return (
    <section className="card">
      <h2 className="text-base font-semibold text-slate-900 mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
function Grid({ cols = 2, children }) {
  return <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-3`}>{children}</div>;
}
function Field({ label, children, colSpan }) {
  return (
    <label className={`block ${colSpan ? `md:col-span-${colSpan}` : ""}`}>
      <div className="text-[13px] text-slate-700 mb-1 font-medium">{label}</div>
      {children}
    </label>
  );
}
function Summary({ label, value }) {
  return (
    <div className="card">
      <div className="text-xs text-slate-600">{label}</div>
      <div className="text-base font-semibold">{fmt(value)}</div>
    </div>
  );
}

function blankItem(no) {
  return {
    no,
    packagesNoAndType: "",
    description: "",
    tariffCode: "",
    unit: "",
    invoiceNo: "",
    quantityActual: "",
    unitValueFOB: "",
    exportDutyRate: "",
    exportDutyAmount: "",
    salesTaxRate: "",
    salesTaxAmount: "",
    otherDutiesType: "",
    otherDutiesRate: "",
    otherDutiesAmount: "",
  };
}

function toNum(v) {
  const n = typeof v === "number" ? v : parseFloat(String(v || "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function fmt(n) {
  return new Intl.NumberFormat("ms-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(toNum(n));
}

function deepSet(obj, path, value) {
  const segs = path.split(".");
  let cur = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    const k = segs[i];
    cur[k] = cur[k] ?? {};
    cur = cur[k];
  }
  cur[segs[segs.length - 1]] = value;
  return obj;
}
