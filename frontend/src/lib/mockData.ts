import type {
  Project,
  Job,
  Alert,
  User,
  ResultFeature,
} from "@/types";

export const mockProjects: Project[] = [
  {
    id: "p_001",
    name: "Sundarbans Mangrove Restoration",
    location: "West Bengal, India",
    createdAt: "2024-11-12T09:24:00Z",
    status: "active",
    description:
      "Long-term mangrove restoration plot covering 1,240 ha in the Indian Sundarbans delta.",
  },
  {
    id: "p_002",
    name: "Pichavaram Coastal Wetlands",
    location: "Tamil Nadu, India",
    createdAt: "2025-01-05T14:11:00Z",
    status: "active",
    description: "Estuarine wetland and mangrove fringe monitoring.",
  },
  {
    id: "p_003",
    name: "Bhitarkanika Conservation Zone",
    location: "Odisha, India",
    createdAt: "2025-02-18T11:02:00Z",
    status: "active",
  },
  {
    id: "p_004",
    name: "Gulf of Mannar Seagrass",
    location: "Tamil Nadu, India",
    createdAt: "2025-03-22T07:45:00Z",
    status: "draft",
  },
  {
    id: "p_005",
    name: "Chilika Lagoon Survey",
    location: "Odisha, India",
    createdAt: "2024-09-30T18:00:00Z",
    status: "archived",
  },
];

const sampleResult: ResultFeature = {
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [88.7, 21.9],
        [88.8, 21.9],
        [88.8, 22.0],
        [88.7, 22.0],
        [88.7, 21.9],
      ],
    ],
  },
  properties: {
    carbon_stock_tCO2e: 18420.5,
    area_ha: 612.3,
    model_version: "bcv-mrv-1.4.2",
    computed_at: "2025-04-18T10:22:00Z",
  },
};

export const mockJobs: Job[] = [
  {
    id: "j_1042",
    projectId: "p_001",
    projectName: "Sundarbans Mangrove Restoration",
    status: "complete",
    createdAt: "2025-04-18T10:11:00Z",
    updatedAt: "2025-04-18T10:22:00Z",
    fileName: "sundarbans_2025_q2.tif",
    result: sampleResult,
  },
  {
    id: "j_1041",
    projectId: "p_002",
    projectName: "Pichavaram Coastal Wetlands",
    status: "running",
    createdAt: "2025-04-22T16:02:00Z",
    fileName: "pichavaram_apr.tif",
  },
  {
    id: "j_1040",
    projectId: "p_003",
    projectName: "Bhitarkanika Conservation Zone",
    status: "pending",
    createdAt: "2025-04-23T08:14:00Z",
    fileName: "bhitarkanika_baseline.tif",
  },
  {
    id: "j_1039",
    projectId: "p_001",
    projectName: "Sundarbans Mangrove Restoration",
    status: "failed",
    createdAt: "2025-04-15T05:40:00Z",
    fileName: "sundarbans_partial.tif",
  },
  {
    id: "j_1038",
    projectId: "p_002",
    projectName: "Pichavaram Coastal Wetlands",
    status: "complete",
    createdAt: "2025-04-10T12:30:00Z",
    updatedAt: "2025-04-10T12:48:00Z",
    fileName: "pichavaram_q1.tif",
    result: {
      ...sampleResult,
      properties: {
        ...sampleResult.properties,
        carbon_stock_tCO2e: 9824.7,
        area_ha: 318.4,
      },
    },
  },
];

export const mockAlerts: Alert[] = [
  {
    id: "a_01",
    type: "critical",
    title: "Carbon stock anomaly detected",
    message:
      "Bhitarkanika plot 12 reports a 14% drop vs. previous quarter. Manual review required.",
    createdAt: "2025-04-22T07:12:00Z",
    read: false,
    projectId: "p_003",
  },
  {
    id: "a_02",
    type: "warning",
    title: "GeoTIFF resolution below threshold",
    message: "Uploaded raster for Pichavaram is 30m/px (recommended ≤10m/px).",
    createdAt: "2025-04-21T14:48:00Z",
    read: false,
    projectId: "p_002",
  },
  {
    id: "a_03",
    type: "info",
    title: "Verification approved",
    message: "Sundarbans Q1 result verified by V. Iyer.",
    createdAt: "2025-04-19T09:00:00Z",
    read: true,
    projectId: "p_001",
  },
];

export const mockUsers: User[] = [
  { id: "u_1", email: "asha@bcmrv.org", role: "analyst", status: "active" },
  { id: "u_2", email: "viyer@bcmrv.org", role: "verifier", status: "active" },
  { id: "u_3", email: "admin@bcmrv.org", role: "admin", status: "active" },
  { id: "u_4", email: "rohit@bcmrv.org", role: "analyst", status: "suspended" },
];

export const mockTimeSeries = [
  { month: "Nov", value: 12400 },
  { month: "Dec", value: 13100 },
  { month: "Jan", value: 14250 },
  { month: "Feb", value: 15820 },
  { month: "Mar", value: 17100 },
  { month: "Apr", value: 18420 },
];

export const mockAreaByProject = [
  { project: "Sundarbans", area: 612.3 },
  { project: "Pichavaram", area: 318.4 },
  { project: "Bhitarkanika", area: 480.1 },
  { project: "Gulf of Mannar", area: 142.0 },
];
