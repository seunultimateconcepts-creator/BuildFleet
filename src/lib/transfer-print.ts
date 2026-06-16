// src/lib/transfer-print.ts
// Opens transfer form in new tab and auto-triggers print to PDF

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function printTransfer(t: any) {
  const fmt = (d: string) =>
    d ? new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric"
    }) : "—";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Transfer_${t.equipment_code}_${new Date().toISOString().slice(0,10)}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:10px;color:#111;padding:16px;max-width:210mm;margin:0 auto}
    .logo-row{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:12px}
    .company{font-size:15px;font-weight:bold}
    .form-title{font-size:11px;color:#555;margin-top:2px}
    .ref{text-align:right;font-size:9px;color:#555}
    .ref strong{display:block;font-size:12px;color:#111;font-family:monospace;margin-bottom:3px}
    .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:bold}
    .badge-temp{background:#dbeafe;color:#1d4ed8}
    .badge-final{background:#fee2e2;color:#b91c1c}
    .section{border:1px solid #ccc;border-radius:3px;margin-bottom:10px;overflow:hidden}
    .section-head{background:#1e293b;color:#fff;padding:5px 10px;font-weight:bold;font-size:10px;display:flex;justify-content:space-between;align-items:center}
    .section-head span{opacity:0.6;font-weight:normal;font-size:9px}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:8px 10px}
    .field label{font-size:8px;color:#888;text-transform:uppercase;letter-spacing:0.4px;display:block;margin-bottom:1px}
    .field span{font-weight:600;font-size:10px}
    .full{grid-column:1/-1}
    .sig-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;padding:8px 10px;border-top:1px solid #eee}
    .sig-box .sig-line{border-top:1px solid #999;margin-top:28px;padding-top:3px;font-size:8px;color:#888}
    .sig-box .name{font-weight:600;font-size:9px}
    .sig-box .role{font-size:8px;color:#888;margin-top:2px}
    .footer{text-align:center;font-size:8px;color:#aaa;margin-top:10px;padding-top:6px;border-top:1px solid #eee}
    .print-btn{display:block;width:100%;padding:10px;background:#1e293b;color:white;border:none;border-radius:6px;font-size:13px;font-weight:bold;cursor:pointer;margin-bottom:16px}
    .print-btn:hover{background:#0f172a}
    @media print{
      .print-btn{display:none}
      @page{margin:1cm;size:A4}
      body{padding:0}
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF — (Ctrl+P)</button>

  <div class="logo-row">
    <div>
      <div class="company">HARTLAND NIGERIA LIMITED</div>
      <div class="form-title">EQUIPMENT TRANSFER FORM — PLANT MANAGEMENT DEPARTMENT</div>
    </div>
    <div class="ref">
      <strong>Ref: ${t.id?.slice(0,8).toUpperCase() || "—"}</strong>
      <span class="badge ${t.transfer_type === 'Final Release' ? 'badge-final' : 'badge-temp'}">
        ${t.transfer_type || "Temporary Release"}
      </span><br/>
      <span>Date: ${fmt(t.transfer_date)}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-head">Equipment Details</div>
    <div class="grid">
      <div class="field"><label>Fleet No.</label><span>${t.equipment_code || "—"}</span></div>
      <div class="field"><label>Description</label><span>${t.equipment_name || "—"}</span></div>
      <div class="field"><label>Category / Type</label><span>${t.machine_type || "—"}</span></div>
      <div class="field"><label>Make</label><span>${t.machine_make || "—"}</span></div>
      <div class="field"><label>Model</label><span>${t.machine_model || "—"}</span></div>
      <div class="field"><label>Reg. No.</label><span>${t.reg_no || "—"}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-head">Dispatching Area <span>Origin site — departure details</span></div>
    <div class="grid">
      <div class="field"><label>From Site</label><span>${t.from_site || "—"}</span></div>
      <div class="field"><label>Cost Code</label><span>${t.from_cost_code || "—"}</span></div>
      <div class="field"><label>Transfer Date</label><span>${fmt(t.transfer_date)}</span></div>
      <div class="field"><label>Expected Arrival</label><span>${fmt(t.expected_arrival_date)}</span></div>
      <div class="field"><label>Transport Mode</label><span>${t.transport_mode || "—"}</span></div>
      <div class="field"><label>Condition</label><span>${t.equipment_condition_dispatch || "—"}</span></div>
      <div class="field"><label>Speedometer / Hours</label><span>${t.speedometer_dispatch || 0}</span></div>
      <div class="field"><label>Fire Extinguisher</label><span>${t.fire_extinguisher_dispatch || "—"}</span></div>
      <div class="field"><label>History File</label><span>${t.history_file_dispatch ? "✓ Included" : "Not Included"}</span></div>
      ${t.fleet_attachments ? `<div class="field full"><label>Fleet Attachments</label><span>${t.fleet_attachments}</span></div>` : ""}
      ${t.dispatch_remarks ? `<div class="field full"><label>Remarks</label><span>${t.dispatch_remarks}</span></div>` : ""}
    </div>
    <div class="sig-row">
      <div class="sig-box">
        <div class="name">${t.dispatching_officer || ""}</div>
        <div class="role">Dispatching Officer</div>
        <div class="sig-line">Name &amp; Signature</div>
      </div>
      <div class="sig-box">
        <div class="name">${t.dispatching_plant_engineer || ""}</div>
        <div class="role">Plant Engineer (Dispatching)</div>
        <div class="sig-line">Name &amp; Signature</div>
      </div>
      <div class="sig-box">
        <div class="role">Date Dispatched:</div>
        <div class="sig-line"></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-head">Receiving Area <span>Destination site — receipt confirmation</span></div>
    <div class="grid">
      <div class="field"><label>To Site</label><span>${t.to_site || "—"}</span></div>
      <div class="field"><label>Cost Code</label><span>${t.to_cost_code || "—"}</span></div>
      <div class="field"><label>Status</label><span>${t.status || "Pending"}</span></div>
      ${t.status === "Received" ? `
      <div class="field"><label>Receival Date</label><span>${fmt(t.receival_date)}</span></div>
      <div class="field"><label>Condition on Receipt</label><span>${t.equipment_condition_receipt || "—"}</span></div>
      <div class="field"><label>Speedometer / Hours</label><span>${t.speedometer_receipt || 0}</span></div>
      ` : `<div class="field full" style="color:#b45309;font-style:italic"><label>Note</label><span>Awaiting receipt confirmation from receiving site</span></div>`}
    </div>
    <div class="sig-row">
      <div class="sig-box">
        <div class="name">${t.receiving_officer || ""}</div>
        <div class="role">Receiving Officer</div>
        <div class="sig-line">Name &amp; Signature</div>
      </div>
      <div class="sig-box">
        <div class="name">${t.receiving_plant_engineer || ""}</div>
        <div class="role">Plant Engineer (Receiving)</div>
        <div class="sig-line">Name &amp; Signature</div>
      </div>
      <div class="sig-box">
        <div class="role">Date Received:</div>
        <div class="sig-line"></div>
      </div>
    </div>
  </div>

  <div class="footer">
    Generated by BuildFleet — Hartland Nigeria Limited Plant Management System &nbsp;|&nbsp;
    ${new Date().toLocaleDateString("en-GB", {weekday:"long",day:"numeric",month:"long",year:"numeric"})}
  </div>
</body>
</html>`;

  // Open in new tab
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}