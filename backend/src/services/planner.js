// Minimal, deterministic planner (no external calls). Replace SLA and buffers with DB lookups.
// Uses: RTA back-planning, buffers, feasibility, simple cost model.

import { DateTime } from 'luxon';

export function planShipment({ intake, cfg, nowIso }) {
  const now = DateTime.fromISO(nowIso || DateTime.now().toISO());
  const rtaLocal = DateTime.fromISO(intake.rta_local, { zone: intake.receiver_tz });
  const buffers = cfg.buffers;

  const modes = intake.mode_preferences?.length ? intake.mode_preferences : ['air','sea'];
  const candidates = [];

  for (const mode of modes) {
    const transitDays = mode === 'air' ? cfg.transit_slas.air_days : cfg.transit_slas.sea_days;

    // Backward scheduling from RTA (final address)
    const rta = rtaLocal;                                                     // receiver TZ
    const etaPort = rta.minus({ hours: buffers.last_mile_hours });            // destination port/airport ETA
    const etdPort = etaPort.minus({ days: transitDays });                     // vessel/flight ETD
    const cutoffHours = mode === 'air' ? buffers.airline_cutoff_hours : buffers.ocean_si_cutoff_hours;
    const gateInOrAwbCutoff = etdPort.minus({ hours: cutoffHours });          // gate-in (sea) or AWB acceptance (air)
    const k2By = gateInOrAwbCutoff.minus({ hours: buffers.customs_export_sla_hours });
    const stuffingStart = gateInOrAwbCutoff.minus({ hours: 12 });             // simple assumption
    const pickupBy = stuffingStart.minus({ hours: 6 });

    // Feasibility checks
    const times = [pickupBy, stuffingStart, k2By, gateInOrAwbCutoff, etdPort, etaPort, rta];
    const anyPast = times.some(dt => dt < now);
    const blockers = [];
    if (anyPast) blockers.push({ type: 'time', message: 'One or more milestones are in the past vs. now.' });

    // Compliance/doc blockers (you’ll have these from Steps 2–5 status in DB)
    if (intake.compliance?.requires_sta && !intake.compliance?.sta_permit_no) {
      blockers.push({ type: 'compliance', message: 'STA permit required but not recorded.' });
    }
    if (intake.screening?.result && intake.screening?.result !== 'yes_clear') {
      blockers.push({ type: 'screening', message: 'End-user screening not clear.' });
    }
    if (!intake.docs?.hs_validated) {
      blockers.push({ type: 'docs', message: 'HS code not validated by broker.' });
    }

    // Cost model (very rough; replace with tariff tables)
    const weight = intake.cargo?.weight_kg || 0;
    const volW = volumetricWeight(intake.cargo?.dims_cm, intake.cargo?.packages);
    const cw = Math.max(weight, volW);
    const base = mode === 'air' ? 3.5 * cw : 80 * Math.ceil(cw / 1000); // USD
    const terminals = mode === 'air' ? 300 : 200;
    const customs = 150;
    const insurance = Math.max(50, (intake.value_usd || 200000) * 0.002);
    const surcharge = mode === 'sea' ? 150 : 120;
    const totalCost = Math.round(base + terminals + customs + insurance + surcharge);

    // Time/cost scores (0 good .. 1 bad)
    const timeSlackHours = rta.diff(now, 'hours').hours;
    const timeScore = timeSlackHours <= 0 ? 1 : 1 / (1 + timeSlackHours / 24); // more slack => better
    const costScore = normalizeCost(totalCost, mode);

    const score = (intake.priorities?.time ?? 0.5) * timeScore +
                  (intake.priorities?.cost ?? 0.5) * costScore;

    candidates.push({
      mode,
      score,
      feasible: blockers.length === 0,
      cost_usd: totalCost,
      milestones: [
        stamp('Factory pickup', pickupBy, intake.shipper_tz),
        stamp('Stuffing/start handover', stuffingStart, intake.shipper_tz),
        stamp(mode === 'air' ? 'AWB acceptance cutoff' : 'Port gate-in cutoff', gateInOrAwbCutoff, intake.shipper_tz),
        stamp('Customs K2 submission', k2By, intake.shipper_tz),
        stamp(mode === 'air' ? 'Flight ETD' : 'Vessel ETD', etdPort, intake.shipper_tz),
        stamp(mode === 'air' ? 'Flight ETA' : 'Vessel ETA', etaPort, intake.receiver_tz),
        stamp('Final delivery (RTA)', rta, intake.receiver_tz)
      ],
      blockers
    });
  }

  // Choose top options by score (lower is better)
  candidates.sort((a,b)=> a.score - b.score);
  return {
    shipment_id: intake.shipment_id,
    options: candidates.slice(0, 3),
    generated_at: now.toISO()
  };
}

function volumetricWeight(dims_cm = [0,0,0], packages = 1) {
  const [L,W,H] = dims_cm;
  const volKg = (L * W * H) / 6000; // air volumetric divisor
  return volKg * (packages || 1);
}

function normalizeCost(total, mode){
  // simple clamp and scale by expected range per mode
  const minMax = mode === 'air' ? [1000, 50000] : [300, 20000];
  const [min, max] = minMax;
  const clamped = Math.max(min, Math.min(max, total));
  return (clamped - min) / (max - min);
}

function stamp(name, dt, zone){
  const local = dt.setZone(zone);
  return {
    name,
    time_local: local.toISO(),
    tz: zone,
    time_utc: local.toUTC().toISO()
  };
}
