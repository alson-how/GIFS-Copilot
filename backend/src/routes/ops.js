import express from 'express';
import { planShipment } from '../services/planner.js';
import { getMaerskToken, searchSchedules } from "../providers/maerskProvider.js";

const router = express.Router();

/**
 * POST /api/ops/plan
 * body: intake + cfg (see contracts above) or the service can fetch cfg from DB.
 */
router.post('/plan', async (req, res) => {
  try {
    const intake = req.body?.intake;
    const cfg = req.body?.cfg;
    if (!intake || !intake.rta_local || !intake.receiver_tz || !intake.shipper_tz)
      return res.status(400).json({ error: 'intake.rta_local, intake.receiver_tz, intake.shipper_tz required' });

    const plan = planShipment({ intake, cfg: cfg || defaultCfg(), nowIso: req.body?.nowIso });
    // Persist a copy if you want:
    // await req.db.query('insert into ops_plans(shipment_id, plan_json) values($1,$2) on conflict (shipment_id) do update set plan_json=$2',
    //                    [intake.shipment_id, plan]);

    res.json(plan);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/ops/plan-maersk
 * body: { intake, cfg, windowFrom, windowTo }
 * Integrates with Maersk API to get real schedules and plan shipment
 */
router.post('/plan-maersk', async (req, res) => {
  try {
    const { intake, cfg, windowFrom, windowTo } = req.body;
    
    // Validate required fields
    if (!intake || !windowFrom || !windowTo) {
      return res.status(400).json({ 
        error: 'intake, windowFrom, and windowTo are required' 
      });
    }

    const auth = await getMaerskToken({
      clientId: process.env.MAERSK_CLIENT_ID,
      clientSecret: process.env.MAERSK_CLIENT_SECRET,
      tokenUrl: process.env.MAERSK_TOKEN_URL
    });

    const schedules = await searchSchedules({
      accessToken: auth.access_token,
      baseUrl: process.env.MAERSK_BASE_URL,             // from portal
      origin: "MYPKG",
      destination: "CNYTN",
      from: windowFrom,                                  // e.g., export_date - 3d
      to: windowTo                                       // e.g., export_date + 3d
    });

    // Pick 3 best sailings by earliest ETA or match to your priorities
    const candidates = (schedules?.items || schedules?.results || []).slice(0, 3).map(it => ({
      mode: "sea",
      etd: it?.origin?.etd || it?.etd,
      eta: it?.destination?.eta || it?.eta,
      service: it?.serviceName,
      vessel: it?.vesselName,
      voyage: it?.voyageNumber
    }));

    // Feed the *best* into your planner
    const best = candidates[0];
    const plan = planShipment({
      intake: {
        ...intake,
        // if you prefer, pin ETD/ETA into intake so planner uses them
        pinnedSchedule: best
      },
      cfg: cfg || defaultCfg()
    });

    return res.json({ schedules: candidates, plan });
  } catch (error) {
    console.error('Error in plan-maersk:', error);
    return res.status(500).json({ error: error.message });
  }
});

function defaultCfg(){
  return {
    buffers: {
      port_dwell_hours: 12,
      airline_cutoff_hours: 6,
      ocean_si_cutoff_hours: 24,
      ocean_vgm_cutoff_hours: 24,
      customs_export_sla_hours: 24,
      last_mile_hours: 8
    },
    transit_slas: { air_days: 3, sea_days: 5 }
  };
}

export default router;
