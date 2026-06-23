// ============================================================
// BUILDFLEET — MASTER TYPE DEFINITIONS
// All types live here. Import from "@/types" everywhere else.
// ============================================================

import { ReactNode } from "react";

// ------------------------------------------------------------
// ROLES
// Controls what each user can see and do in the app.
// ------------------------------------------------------------
export type UserRole =
  | "plant_manager"
  | "plant_director"
  | "plant_engineer"
  | "plant_admin"
  | "site_supervisor"
  | "Plant_Officer"
  | "plant_clerk";

export type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  staff_no: string;
  site?: string;         // which site they're assigned to (optional)
  phone?: string;
  created_at: string;
};

// ------------------------------------------------------------
// SITES / PROJECTS
// A "site" is a physical location — project site, yard, workshop.
// ------------------------------------------------------------
export type SiteType =
  | "Project"
  | "Yard (Storage)"
  | "Yard (Repair)"
  | "Yard (Scrap)"
  | "Workshop (Central)"
  | "Workshop (Field)"
  | "Asphalt Plant"
  | "Overhead"
  | "Haulage Yard";

export type Site = {
  id: string;
  name: string;           // e.g. "Ekewan Axis (Benin)"
  code: string;           // e.g. "AS-07"
  region: string;         // e.g. "Edo", "Abia", "Delta"
  type: SiteType;
  cost_code?: string;
  project_manager?: string;
  is_active: boolean;
  created_at: string;
};

// ------------------------------------------------------------
// EQUIPMENT
// The main entity. Created by the Commissioning process.
// ------------------------------------------------------------
export type OperationalStatus =
  | "Working"
  | "Under Repair"
  | "Idle"
  | "Scrapped"
  | "Break Down"
  | "Stand By";

export type EquipmentCondition =
  | "Very Good"
  | "Good"
  | "Fair-Good"
  | "Fair"
  | "Poor-Fair"
  | "Poor"
  | "Scrapped";

export type FleetStatus =
  | "Addition"       // brand new to the fleet
  | "Replacement";   // replacing an existing unit

export type Equipment = {
  id: string;
  code: string;           // Fleet No. e.g. "EXC-001"
  fleet_number: string;   // same as code, used in forms
  commissioning_id?: string;
  

  // Identity
  name: string;           // Description e.g. "CAT 320 Excavator"
  type_code: string;      // e.g. "050309"
  category: string;       // e.g. "Excavator", "Light Vehicle"
  make: string;           // e.g. "Caterpillar"
  model: string;          // e.g. "320D"
  year: number;           // year of manufacture

  // Technical
  serial_no?: string;
  chassis_no?: string;
  engine_serial?: string;
  reg_no?: string;        // vehicle registration number
  engine_power?: string;
  size_capacity?: string;
  tank_capacity?: string;
  meter_device?: string;

  // Location
  site: string;           // current site name
  site_id?: string;
  region: string;

  // Status
  operational_status: OperationalStatus;
  assessment: EquipmentCondition;
  fleet_status: FleetStatus;

  // Meters
  current_hour_meter?: number;
  current_kilometer?: number;

  // Dates
  date_received?: string;
  commission_date: string;
  year_of_manufacturing?: number;

  // Financial (from commissioning Account section)
  purchase_cost?: number;
  landed_cost?: number;
  depreciation?: string;
  life_expectancy?: string;
  insurance_policy?: string;
  insurance_expiry?: string;

  // Supplier
  supplier?: string;
  supplier_code?: string;
  order_no?: string;
  invoice_no?: string;

  created_at: string;
};

// ------------------------------------------------------------
// COMMISSIONING
// The full PLT-01 form. Submitting this creates an Equipment record.
// ------------------------------------------------------------
export type Commissioning = {
  id: string;
  fleet_number: string;
  fleet_status: FleetStatus;

  // Plant Section
  type_code: string;
  description: string;
  category: string;
  make: string;
  model: string;
  chassis_no?: string;
  engine_power?: string;
  engine_displacement?: string;
  size_capacity?: string;
  tank_capacity?: string;
  meter_device?: string;
  year_of_manufacturing: number;
  life_expectancy?: string;
  date_received: string;
  date_commissioned: string;
  equipment_condition: EquipmentCondition;
  depreciation?: string;
  condition_at_receipt: "New" | "Second Hand";
  supplier: string;
  supplier_code?: string;
  order_no?: string;
  invoice_no?: string;

  // Location
  area_project: string;
  location: string;
  cost_code?: string;
  serial_no?: string;
  reg_no?: string;
  region: string;

  // Account Section — Insurance
  policy_cover_no?: string;
  insurance_expiry?: string;
  total_loss?: boolean;
  all_risk_comprehensive?: boolean;
  third_party_liability?: boolean;
  plant_all_risk?: boolean;
  insurance_company?: string;
  insured_sum?: number;
  annual_premium?: number;

  // Account Section — Costs
  purchase_cost?: number;
  freight?: number;
  insurance_on_sea?: number;
  clearing_customs?: number;
  inland_transport?: number;
  other_charges?: number;
  landed_cost?: number;

  // Signatories
  plant_engineer?: string;
  plant_manager?: string;
  remarks?: string;

  // Opening meters (what the equipment starts at)
  opening_hour_meter?: number;
  opening_kilometer?: number;

  commissioned_by: string;
  created_at: string;
};

// ------------------------------------------------------------
// TRANSFER
// The Equipment Transfer Form. Two-sided: dispatching + receiving.
// ------------------------------------------------------------
export type TransferStatus =
  | "Pending"
  | "In Transit"
  | "Received"
  | "Cancelled";

export type TransferType =
  | "Temporary Release"
  | "Final Release";

export type Transfer = {
  id: string;
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  machine_type: string;
  machine_make: string;
  machine_model: string;
  reg_no?: string;

  transfer_type: TransferType;
  status: TransferStatus;

  // Dispatching
  from_site: string;
  from_cost_code?: string;
  transfer_date: string;
  expected_arrival_date?: string;
  dispatching_officer: string;
  dispatching_plant_engineer: string;

  // Dispatch checklist
  equipment_condition_dispatch?: string;
  transport_mode?: string;
  history_file_dispatch?: boolean;
  accompanying_operator?: string;
  speedometer_dispatch?: number;
  fire_extinguisher_dispatch?: string;
  fleet_attachments?: string;
  dispatch_remarks?: string;

  // Receiving
  to_site: string;
  to_cost_code?: string;
  receival_date?: string;
  receiving_officer?: string;
  receiving_plant_engineer?: string;

  // Receive checklist
  equipment_condition_receipt?: string;
  history_file_receipt?: boolean;
  speedometer_receipt?: number;
  fire_extinguisher_receipt?: string;
  receipt_remarks?: string;

  created_at: string;
};

// ------------------------------------------------------------
// DAILY LOGS
// Three types: Plant (PLT-02A), Transport (PLT-02), 3rd Party (PLT-02B)
// ------------------------------------------------------------
export type LogType = "Plant" | "Transport" | "Third Party";

export type LogEntry = {
  sno: number;
  idle_hours?: number;
  working_hours?: number;
  breakdown_hours?: number;
  total_hours?: number;
  fuel_quantity?: number;
  fuel_type?: string;
  lubricant_quantity?: number;
  lubricant_type?: string;
  km_start?: number;
  km_stop?: number;
  km_logged?: number;
  job_code?: string;
  remarks?: string;
};

export type DailyLog = {
  id: string;
  log_type: LogType;
  serial_no: string;
  month: string;           // e.g. "2026-05"

  // Equipment
  equipment_id?: string;
  fleet_no: string;
  fleet_type: string;
  reg_no?: string;

  // Location
  area_project: string;
  location: string;
  cost_code?: string;

  // Personnel
  user_name: string;          // who the equipment is assigned to
  operator_name: string;
  operator_staff_no?: string;

  // Equipment specs
  engine_power?: string;
  consumption?: number;
  tank_capacity?: number;
  meter_device?: string;      // "Hours" or "Km"
  base_of_hire?: string;
  daily_rate?: number;

  // 3rd party only
  third_party_company?: string;

  // The daily rows (31 rows for each day of month)
  entries: LogEntry[];

  // Totals (auto-calculated)
  total_idle?: number;
  total_working?: number;
  total_breakdown?: number;
  total_fuel?: number;
  total_lubricant?: number;
  total_km?: number;

  // Approval
  approval_status: "Draft" | "Submitted" | "Approved" | "Rejected";

  // Signatories
  plant_engineer?: string;
  plant_engineer_staff_no?: string;
  site_supervisor?: string;
  site_supervisor_staff_no?: string;
  project_manager?: string;
  project_manager_staff_no?: string;
  plant_admin?: string;
  plant_admin_staff_no?: string;

  created_by: string;
  created_at: string;
};

// ------------------------------------------------------------
// MAINTENANCE
// Tracks breakdowns, repairs, and preventive maintenance.
// ------------------------------------------------------------
export type MaintenanceType =
  | "Breakdown"
  | "Preventive"
  | "Corrective"
  | "Service";

export type MaintenanceStatus =
  | "Pending"
  | "In Progress"
  | "Completed"
  | "Cancelled";

export type Maintenance = {
  equipmentcode: ReactNode;
  equipmentName: ReactNode;
  id: string;
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;

  maintenance_type: MaintenanceType;
  status: MaintenanceStatus;

  issue: string;
  description?: string;

  reported_by: string;
  reported_date: string;

  technician?: string;
  workshop?: string;

  start_date?: string;
  completion_date?: string;

  hour_meter_at_service?: number;
  km_at_service?: number;

  parts_used?: string;
  cost?: number;

  remarks?: string;
  created_at: string;
};

// ------------------------------------------------------------
// EQUIPMENT HISTORY
// Audit trail — every time something happens to an equipment.
// ------------------------------------------------------------
export type HistoryActionType =
  | "Commissioned"
  | "Transferred"
  | "Status Changed"
  | "Maintenance Started"
  | "Maintenance Completed"
  | "Log Submitted"
  | "Decommissioned";

export type EquipmentHistory = {
  id: string;
  equipment_id: string;
  fleet_number: string;
  action_type: HistoryActionType;
  from_site?: string;
  to_site?: string;
  from_status?: string;
  to_status?: string;
  performed_by: string;
  remarks?: string;
  created_at: string;
};