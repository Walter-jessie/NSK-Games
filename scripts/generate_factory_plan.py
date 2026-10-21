"""
NSK Plant Arena Repair — 2D Factory Blueprint & Layout Generator (v6)
Features:
- 10 Compact Real-World Application Units powered by NSK Precision Bearings
- Escalating Enemy Incursion Waves:
    * Wave 1: 1 Drone attacks 1 Machine
    * Wave 2: 2 Drones attack 2 Machines simultaneously
    * Wave 3: 3 Drones attack 3 Machines simultaneously
    * Final Wave: All-Out Swarm (4-5 Machines attacked at once for maximum pressure!)
- 38 Wooden Boxes: 26 Normal Decoys (Empty) + 12 Genuine NSK Logo Boxes (1 Bearing each)
- 60m x 40m Arena with 100% open floor (zero conveyor hurdles)
"""

import os
import json
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

ARENA_WIDTH = 60.0   # Meters (-30 to +30)
ARENA_HEIGHT = 40.0  # Meters (-20 to +20)

# ═══ 10 COMPACT REAL-WORLD APPLICATIONS POWERED BY NSK BEARINGS ═══
MACHINES = [
    # North Row (3 stations)
    {
        "id": "APP_01",
        "name": "Electric Vehicle (EV) Powertrain Dyno",
        "type": "ev_powertrain",
        "x": -18.0,
        "y": 12.0,
        "width": 5.5,
        "height": 3.8,
        "color": "#38bdf8",
        "desc": "High-Speed EV Motor & Differential (Silent Low-Friction)"
    },
    {
        "id": "APP_02",
        "name": "Automated Guided Vehicle (AGV) Steer-Drive Hub",
        "type": "agv_drive",
        "x": 0.0,
        "y": 12.0,
        "width": 5.2,
        "height": 3.8,
        "color": "#38bdf8",
        "desc": "Warehouse Robotics High-Load Steering Swivel Bearings"
    },
    {
        "id": "APP_03",
        "name": "Articulated Industrial Robot Arm Cell",
        "type": "robot_arm",
        "x": 18.0,
        "y": 12.0,
        "width": 5.5,
        "height": 3.8,
        "color": "#f59e0b",
        "desc": "Zero-Backlash Robot Joint Harmonic Bearings"
    },

    # Mid-North Row (2 stations flanking center)
    {
        "id": "APP_04",
        "name": "Precision CNC Machining Spindle Bench",
        "type": "cnc_spindle",
        "x": -13.0,
        "y": 4.5,
        "width": 5.2,
        "height": 3.6,
        "color": "#a855f7",
        "desc": "Sub-Micron High-Rigidity Machine Tool Spindle"
    },
    {
        "id": "APP_05",
        "name": "Wind Turbine Planetary Gearbox Rig",
        "type": "wind_gearbox",
        "x": 13.0,
        "y": 4.5,
        "width": 5.2,
        "height": 3.6,
        "color": "#10b981",
        "desc": "Heavy-Duty Spherical Roller Bearings for Green Energy"
    },

    # Mid-South Row (2 stations flanking center)
    {
        "id": "APP_06",
        "name": "Bullet Train Wheelset & Axle Bogie",
        "type": "train_bogie",
        "x": -13.0,
        "y": -4.5,
        "width": 5.5,
        "height": 3.6,
        "color": "#6366f1",
        "desc": "Shinkansen 350+ km/h Tapered Axle Journal Bearings"
    },
    {
        "id": "APP_07",
        "name": "Medical Ultra-High-Speed Micro-Spindle",
        "type": "medical_spindle",
        "x": 13.0,
        "y": -4.5,
        "width": 5.2,
        "height": 3.6,
        "color": "#14b8a6",
        "desc": "Dental & Surgical 400,000 RPM Miniature Ceramic Bearings"
    },

    # South Row (3 stations)
    {
        "id": "APP_08",
        "name": "Drone & Air-Taxi Propulsor Bench",
        "type": "aero_propulsor",
        "x": -18.0,
        "y": -12.0,
        "width": 5.5,
        "height": 3.8,
        "color": "#ec4899",
        "desc": "High-RPM Lightweight Ceramic Hybrid Motor Bearings"
    },
    {
        "id": "APP_09",
        "name": "Aerospace Jet Engine APU Turbine",
        "type": "jet_apu",
        "x": 0.0,
        "y": -12.0,
        "width": 5.2,
        "height": 3.8,
        "color": "#ef4444",
        "desc": "High-Temperature Titanium/Ceramic Jet Engine Bearings"
    },
    {
        "id": "APP_10",
        "name": "HVAC Centrifugal Climate Compressor",
        "type": "hvac_compressor",
        "x": 18.0,
        "y": -12.0,
        "width": 5.5,
        "height": 3.8,
        "color": "#06b6d4",
        "desc": "Whisper-Quiet Industrial Chiller & Heat Pump Bearings"
    }
]

# ═══ 38 WOODEN BOXES: 26 DECOY BOXES (EMPTY) + 12 GENUINE NSK LOGO BOXES (1 BEARING) ═══
ALL_BOXES = [
    # ── North-West Warehouse Cluster (4 boxes: 3 Decoys + 1 NSK) ──
    {"id": "BX_01", "type": "decoy", "x": -25.5, "y": 17.0, "hasNskLogo": False, "region": "NW Logistics"},
    {"id": "BX_02", "type": "decoy", "x": -23.5, "y": 17.0, "hasNskLogo": False, "region": "NW Logistics"},
    {"id": "BX_03", "type": "decoy", "x": -25.5, "y": 15.0, "hasNskLogo": False, "region": "NW Logistics"},
    {"id": "BX_04", "type": "nsk_loot", "x": -23.5, "y": 15.0, "hasNskLogo": True, "region": "NW Logistics"}, # ★ NSK

    # ── North-East Assembly Cluster (4 boxes: 3 Decoys + 1 NSK) ──
    {"id": "BX_05", "type": "decoy", "x": 23.5, "y": 17.0, "hasNskLogo": False, "region": "NE Assembly"},
    {"id": "BX_06", "type": "decoy", "x": 25.5, "y": 17.0, "hasNskLogo": False, "region": "NE Assembly"},
    {"id": "BX_07", "type": "decoy", "x": 25.5, "y": 15.0, "hasNskLogo": False, "region": "NE Assembly"},
    {"id": "BX_08", "type": "nsk_loot", "x": 23.5, "y": 15.0, "hasNskLogo": True, "region": "NE Assembly"}, # ★ NSK

    # ── South-West Storage Cluster (4 boxes: 3 Decoys + 1 NSK) ──
    {"id": "BX_09", "type": "decoy", "x": -25.5, "y": -17.0, "hasNskLogo": False, "region": "SW Storage"},
    {"id": "BX_10", "type": "decoy", "x": -23.5, "y": -17.0, "hasNskLogo": False, "region": "SW Storage"},
    {"id": "BX_11", "type": "decoy", "x": -25.5, "y": -15.0, "hasNskLogo": False, "region": "SW Storage"},
    {"id": "BX_12", "type": "nsk_loot", "x": -23.5, "y": -15.0, "hasNskLogo": True, "region": "SW Storage"}, # ★ NSK

    # ── South-East QC Cluster (4 boxes: 3 Decoys + 1 NSK) ──
    {"id": "BX_13", "type": "decoy", "x": 23.5, "y": -17.0, "hasNskLogo": False, "region": "SE QC"},
    {"id": "BX_14", "type": "decoy", "x": 25.5, "y": -17.0, "hasNskLogo": False, "region": "SE QC"},
    {"id": "BX_15", "type": "decoy", "x": 25.5, "y": -15.0, "hasNskLogo": False, "region": "SE QC"},
    {"id": "BX_16", "type": "nsk_loot", "x": 23.5, "y": -15.0, "hasNskLogo": True, "region": "SE QC"}, # ★ NSK

    # ── North Corridor & Gate Alcoves (4 boxes: 3 Decoys + 1 NSK) ──
    {"id": "BX_17", "type": "decoy", "x": -10.0, "y": 16.5, "hasNskLogo": False, "region": "North Corridor"},
    {"id": "BX_18", "type": "nsk_loot", "x": 0.0, "y": 16.5, "hasNskLogo": True, "region": "North Gate"}, # ★ NSK
    {"id": "BX_19", "type": "decoy", "x": -4.0, "y": 16.0, "hasNskLogo": False, "region": "North Corridor"},
    {"id": "BX_20", "type": "decoy", "x": 10.0, "y": 16.5, "hasNskLogo": False, "region": "North Corridor"},

    # ── South Corridor & Gate Alcoves (4 boxes: 3 Decoys + 1 NSK) ──
    {"id": "BX_21", "type": "decoy", "x": -10.0, "y": -16.5, "hasNskLogo": False, "region": "South Corridor"},
    {"id": "BX_22", "type": "nsk_loot", "x": 0.0, "y": -16.5, "hasNskLogo": True, "region": "South Gate"}, # ★ NSK
    {"id": "BX_23", "type": "decoy", "x": 4.0, "y": -16.0, "hasNskLogo": False, "region": "South Corridor"},
    {"id": "BX_24", "type": "decoy", "x": 10.0, "y": -16.5, "hasNskLogo": False, "region": "South Corridor"},

    # ── Far West Perimeter Wall (3 boxes: 2 Decoys + 1 NSK) ──
    {"id": "BX_25", "type": "decoy", "x": -27.0, "y": 6.5, "hasNskLogo": False, "region": "West Wall"},
    {"id": "BX_26", "type": "nsk_loot", "x": -27.0, "y": 0.0, "hasNskLogo": True, "region": "West Exit"}, # ★ NSK
    {"id": "BX_27", "type": "decoy", "x": -27.0, "y": -6.5, "hasNskLogo": False, "region": "West Wall"},

    # ── Far East Perimeter Wall (3 boxes: 2 Decoys + 1 NSK) ──
    {"id": "BX_28", "type": "decoy", "x": 27.0, "y": 6.5, "hasNskLogo": False, "region": "East Wall"},
    {"id": "BX_29", "type": "nsk_loot", "x": 27.0, "y": 0.0, "hasNskLogo": True, "region": "East Dock"}, # ★ NSK
    {"id": "BX_30", "type": "decoy", "x": 27.0, "y": -6.5, "hasNskLogo": False, "region": "East Wall"},

    # ── Central Roaming Crossings & Inter-Machine Aisles (8 boxes: 4 Decoys + 4 NSK) ──
    {"id": "BX_31", "type": "decoy", "x": -6.0, "y": 8.0, "hasNskLogo": False, "region": "NW Inter-Aisle"},
    {"id": "BX_32", "type": "nsk_loot", "x": -6.0, "y": 4.5, "hasNskLogo": True, "region": "Mid-West Crossing"}, # ★ NSK
    {"id": "BX_33", "type": "decoy", "x": 6.0, "y": 8.0, "hasNskLogo": False, "region": "NE Inter-Aisle"},
    {"id": "BX_34", "type": "nsk_loot", "x": 6.0, "y": 4.5, "hasNskLogo": True, "region": "Mid-East Crossing"}, # ★ NSK
    {"id": "BX_35", "type": "nsk_loot", "x": -6.0, "y": -4.5, "hasNskLogo": True, "region": "Mid-SW Crossing"}, # ★ NSK
    {"id": "BX_36", "type": "decoy", "x": 6.0, "y": -8.0, "hasNskLogo": False, "region": "SE Inter-Aisle"},
    {"id": "BX_37", "type": "decoy", "x": -6.0, "y": -8.0, "hasNskLogo": False, "region": "SW Inter-Aisle"},
    {"id": "BX_38", "type": "nsk_loot", "x": 6.0, "y": -4.5, "hasNskLogo": True, "region": "Mid-SE Crossing"}, # ★ NSK
]

# ═══ ESCALATING ENEMY WAVE CONFIGURATION ═══
ENEMY_WAVES = [
    {
        "wave": 1,
        "name": "Phase 1: Scout Probe",
        "drones": 1,
        "targets": 1,
        "countdownSec": 20,
        "desc": "1 lone scout drone attacks 1 machine. Time to search & learn the loop."
    },
    {
        "wave": 2,
        "name": "Phase 2: Dual Strike",
        "drones": 2,
        "targets": 2,
        "countdownSec": 18,
        "desc": "Immediately after Wave 1 is fixed, 2 drones attack 2 machines simultaneously!"
    },
    {
        "wave": 3,
        "name": "Phase 3: Triple Pressure",
        "drones": 3,
        "targets": 3,
        "countdownSec": 16,
        "desc": "Once 1 machine is fixed in Wave 2, threat spikes: 3 drones strike 3 machines."
    },
    {
        "wave": 4,
        "name": "Final Phase: All-Out Swarm",
        "drones": 5,
        "targets": 4,
        "countdownSec": 14,
        "desc": "OVERDRIVE! All remaining drones swarm, attacking 4-5 machines simultaneously!"
    }
]

def draw_box(ax, b):
    x, y = b["x"], b["y"]
    is_nsk = b["hasNskLogo"]
    size = 1.1
    hx, hy = size / 2.0, size / 2.0

    if is_nsk:
        # ═══ 1. GENUINE NSK LOGO WOODEN BOX (Interactive · Yields 1 Bearing) ═══
        halo = patches.Circle((x, y), 1.5, facecolor='#f59e0b', alpha=0.15, edgecolor='#fbbf24', linestyle='--', lw=0.8, zorder=3)
        ax.add_patch(halo)

        box_rect = patches.Rectangle((x - hx, y - hy), size, size, linewidth=1.3, edgecolor='#f59e0b', facecolor='#92400e', zorder=8)
        ax.add_patch(box_rect)

        ax.plot([x - hx, x + hx], [y - hy, y + hy], color='#b45309', lw=0.8, zorder=9)
        ax.plot([x - hx, x + hx], [y + hy, y - hy], color='#b45309', lw=0.8, zorder=9)

        # Bold NSK Red Stencil Logo
        stamp_badge = patches.Rectangle((x - 0.42, y - 0.20), 0.84, 0.40, facecolor='#E60012', edgecolor='#ffffff', lw=0.5, zorder=10)
        ax.add_patch(stamp_badge)
        ax.text(x, y - 0.02, "NSK", ha='center', va='center', color='#ffffff', fontsize=6.0, weight='bold', fontfamily='sans-serif', zorder=11)

        ax.text(x, y + hy + 0.32, "★ NSK", ha='center', va='bottom', color='#fde047', fontsize=5.2, weight='bold', fontfamily='sans-serif', zorder=15, bbox=dict(boxstyle="round,pad=0.1", fc="#091024", ec="#f59e0b", lw=0.5))
    else:
        # ═══ 2. NORMAL DECOY WOODEN BOX (Empty · Non-Interactive · No Logo) ═══
        box_rect = patches.Rectangle((x - hx, y - hy), size, size, linewidth=0.8, edgecolor='#78350f', facecolor='#451a03', alpha=0.85, zorder=7)
        ax.add_patch(box_rect)

        ax.plot([x - hx, x + hx], [y - hy, y + hy], color='#572204', lw=0.5, zorder=8)
        ax.plot([x - hx, x + hx], [y + hy, y - hy], color='#572204', lw=0.5, zorder=8)


def generate_blueprint():
    print("[Python] Generating Updated 2D CAD Blueprint with 10 Real-World Apps & Escalating Enemy Waves...")
    fig, ax = plt.subplots(figsize=(19, 12), dpi=200)
    fig.patch.set_facecolor('#070c18')
    ax.set_facecolor('#091024')

    half_w = ARENA_WIDTH / 2.0
    half_h = ARENA_HEIGHT / 2.0

    ax.set_xlim(-half_w - 4, half_w + 4)
    ax.set_ylim(-half_h - 4, half_h + 4)
    ax.set_aspect('equal')

    # 1. Blueprint Grid Lines
    for x in np.arange(-half_w, half_w + 0.1, 2.0):
        ax.axvline(x, color='#111f3d', linewidth=0.5, zorder=1)
    for y in np.arange(-half_h, half_h + 0.1, 2.0):
        ax.axhline(y, color='#111f3d', linewidth=0.5, zorder=1)
    for x in np.arange(-half_w, half_w + 0.1, 10.0):
        ax.axvline(x, color='#1a3260', linewidth=1.0, linestyle='--', zorder=1)
    for y in np.arange(-half_h, half_h + 0.1, 10.0):
        ax.axhline(y, color='#1a3260', linewidth=1.0, linestyle='--', zorder=1)

    # 2. Open Roaming Highways
    ax.add_patch(patches.Rectangle((-half_w, -2.5), ARENA_WIDTH, 5.0, facecolor='#0d2348', alpha=0.45, zorder=2))
    ax.add_patch(patches.Rectangle((-half_w, 7.5), ARENA_WIDTH, 3.5, facecolor='#0d2348', alpha=0.30, zorder=2))
    ax.add_patch(patches.Rectangle((-half_w, -11.0), ARENA_WIDTH, 3.5, facecolor='#0d2348', alpha=0.30, zorder=2))

    # 3. Outer Walls & Doors
    ax.add_patch(patches.Rectangle((-half_w, -half_h), ARENA_WIDTH, ARENA_HEIGHT, linewidth=3.5, edgecolor='#38bdf8', facecolor='none', zorder=10))
    ax.add_patch(patches.Rectangle((-half_w + 0.6, -half_h + 0.6), ARENA_WIDTH - 1.2, ARENA_HEIGHT - 1.2, linewidth=1.0, edgecolor='#0284c7', facecolor='none', linestyle=':', zorder=10))

    door_len = 5.0
    doors = [
        (0 - door_len/2, half_h, door_len, 0.6),
        (0 - door_len/2, -half_h - 0.6, door_len, 0.6),
        (-half_w - 0.6, 0 - door_len/2, 0.6, door_len),
        (half_w, 0 - door_len/2, 0.6, door_len),
    ]
    for dx, dy, dw, dh in doors:
        ax.add_patch(patches.Rectangle((dx, dy), dw, dh, facecolor='#f59e0b', edgecolor='#fbbf24', zorder=12))

    # Corridor Annotations
    ax.annotate("◄── CENTRAL ROAMING HIGHWAY (ZERO HURDLES / NO CONVEYORS) ──►", xy=(0, 0), xytext=(0, -2.2), ha='center', va='center', color='#93c5fd', fontsize=9.0, fontfamily='monospace', weight='bold', bbox=dict(boxstyle="round,pad=0.25", fc="#091024", ec="#3b82f6", lw=1.0, alpha=0.9), zorder=5)

    # 4. Render the 10 Compact Real-World Applications
    for m in MACHINES:
        mx, my = m["x"], m["y"]
        mw, mh = m["width"], m["height"]

        # Safety Zone
        safety_pad = 0.8
        ax.add_patch(patches.Rectangle((mx - mw/2 - safety_pad, my - mh/2 - safety_pad), mw + safety_pad*2, mh + safety_pad*2, linewidth=1.0, edgecolor='#f59e0b', facecolor='#f59e0b', alpha=0.10, linestyle='--', zorder=3))
        # Interaction Halo
        ax.add_patch(patches.Circle((mx, my), 3.8, edgecolor='#38bdf8', facecolor='#38bdf8', alpha=0.07, linewidth=0.9, linestyle=':', zorder=2))
        # Machine Outer Body
        ax.add_patch(patches.Rectangle((mx - mw/2, my - mh/2), mw, mh, linewidth=1.8, edgecolor=m["color"], facecolor='#0c1a36', zorder=6))
        # Inner Core
        ax.add_patch(patches.Rectangle((mx - mw/2 + 0.5, my - mh/2 + 0.5), mw - 1.0, mh - 1.0, linewidth=0.9, edgecolor='#0284c7', facecolor='#061024', zorder=7))
        # Status Light
        ax.add_patch(patches.Circle((mx - mw/2 + 0.5, my + mh/2 - 0.5), 0.3, facecolor='#10b981', edgecolor='#34d399', zorder=9))

        ax.text(mx, my + mh/2 + 0.65, f"[{m['id']}] {m['name']}", ha='center', va='bottom', color='#f0f9ff', fontsize=7.2, weight='bold', zorder=15)
        ax.text(mx, my - mh/2 - 0.6, f"{m['desc']} ({mw}m x {mh}m)", ha='center', va='top', color='#94a3b8', fontsize=5.8, zorder=15)

    # 5. Render All 38 Wooden Boxes (26 Decoys + 12 NSK Loot)
    for b in ALL_BOXES:
        draw_box(ax, b)

    # 6. Player Starting Point (Spawn at Center 0, 0)
    ax.add_patch(patches.Circle((0, 0), 2.2, facecolor='#10b981', alpha=0.15, edgecolor='#34d399', linestyle='--', zorder=4))
    ax.add_patch(patches.Circle((0, 0), 0.7, facecolor='#10b981', edgecolor='#ffffff', linewidth=1.5, zorder=12))
    ax.arrow(0, 0, 0, 1.4, head_width=0.6, head_length=0.5, fc='#ffffff', ec='#10b981', zorder=13)
    ax.text(0, -1.5, "[*] WORKER SPAWN (0, 0)", ha='center', va='top', color='#34d399', fontsize=7.2, fontfamily='sans-serif', weight='bold', zorder=15, bbox=dict(boxstyle="round,pad=0.2", fc="#091024", ec="#10b981", lw=0.8))

    # 7. Escalating Enemy Incursion Waves Card (Bottom-Left)
    wave_card = patches.Rectangle((-half_w + 1.2, -half_h + 1.2), 22.0, 9.8, linewidth=1.3, edgecolor='#ef4444', facecolor='#0b1124', zorder=20)
    ax.add_patch(wave_card)

    ax.text(-half_w + 12.2, -half_h + 10.2, "ESCALATING ENEMY WAVE PRESSURE SYSTEM", ha='center', va='top', color='#f87171', fontsize=7.5, weight='bold', fontfamily='sans-serif', zorder=21)
    ax.text(-half_w + 1.8, -half_h + 8.6, "• WAVE 1: 1 Drone strikes 1 Machine (Learn loop)", ha='left', va='top', color='#fde047', fontsize=6.3, fontfamily='sans-serif', zorder=21)
    ax.text(-half_w + 1.8, -half_h + 7.1, "• WAVE 2: Fix Wave 1 -> 2 Drones strike 2 Machines simultaneously!", ha='left', va='top', color='#fb923c', fontsize=6.3, fontfamily='sans-serif', zorder=21)
    ax.text(-half_w + 1.8, -half_h + 5.6, "• WAVE 3: Fix 1 in Wave 2 -> 3 Drones attack 3 Machines!", ha='left', va='top', color='#f87171', fontsize=6.3, fontfamily='sans-serif', zorder=21)
    ax.text(-half_w + 1.8, -half_h + 4.1, "• FINAL WAVE: ALL-OUT SWARM! (4-5 Machines attacked at once!)", ha='left', va='top', color='#ef4444', fontsize=6.3, weight='bold', fontfamily='sans-serif', zorder=21)
    ax.text(-half_w + 1.8, -half_h + 2.5, "10 Total Machines allow continuous escalating pressure without instant defeat.", ha='left', va='top', color='#94a3b8', fontsize=5.8, fontfamily='monospace', zorder=21)

    # 8. Scavenger Hunt Legend Card (Top-Left)
    legend_box = patches.Rectangle((-half_w + 1.2, half_h - 12.2), 19.5, 11.0, linewidth=1.2, edgecolor='#f59e0b', facecolor='#060d1f', zorder=20)
    ax.add_patch(legend_box)

    ax.text(-half_w + 10.95, half_h - 1.6, "SCAVENGER HUNT SUPPLY SYSTEM", ha='center', va='top', color='#fbbf24', fontsize=7.8, weight='bold', fontfamily='sans-serif', zorder=21)
    ax.text(-half_w + 10.95, half_h - 3.1, "38 TOTAL BOXES SCATTERED ACROSS FLOOR", ha='center', va='top', color='#ffffff', fontsize=6.4, fontfamily='monospace', weight='bold', zorder=21)

    # Decoy explanation
    ax.text(-half_w + 10.95, half_h - 4.8, "[#] 26 NORMAL DECOY BOXES (EMPTY):", ha='center', va='top', color='#94a3b8', fontsize=6.4, fontfamily='sans-serif', weight='bold', zorder=21)
    ax.text(-half_w + 10.95, half_h - 6.2, "    - Plain wood, NO NSK logo\n    - NON-INTERACTIVE (Cannot be smashed)", ha='center', va='top', color='#64748b', fontsize=6.0, fontfamily='sans-serif', zorder=21)

    # NSK explanation
    ax.text(-half_w + 10.95, half_h - 8.3, "[★] 12 GENUINE NSK LOGO BOXES (REAL LOOT):", ha='center', va='top', color='#fde047', fontsize=6.4, fontfamily='sans-serif', weight='bold', zorder=21)
    ax.text(-half_w + 10.95, half_h - 9.7, "    - Stamped with RED NSK LOGO\n    - Tap [SMASH] -> Collect 1 Bearing!", ha='center', va='top', color='#34d399', fontsize=6.0, fontfamily='sans-serif', weight='bold', zorder=21)

    # 9. Professional CAD Title Block
    title_box = patches.Rectangle((half_w - 19.5, -half_h + 1.2), 18.5, 6.2, linewidth=1.5, edgecolor='#38bdf8', facecolor='#060d1f', zorder=20)
    ax.add_patch(title_box)

    ax.text(half_w - 10.25, -half_h + 6.3, "NSK PRECISION MOTION & CONTROL", ha='center', va='top', color='#ef4444', fontsize=7.5, weight='bold', fontfamily='sans-serif', zorder=21)
    ax.text(half_w - 10.25, -half_h + 5.1, "GLOBAL APPS SHOWCASE BLUEPRINT (v6)", ha='center', va='top', color='#f0f9ff', fontsize=7.8, weight='bold', fontfamily='sans-serif', zorder=21)
    ax.text(half_w - 10.25, -half_h + 3.8, "DIMENSIONS: 60.00m x 40.00m · ZERO HURDLES", ha='center', va='top', color='#38bdf8', fontsize=6.6, fontfamily='monospace', zorder=21)
    ax.text(half_w - 10.25, -half_h + 2.7, "10 REAL-WORLD APPS · 38 BOXES (26 DECOY / 12 NSK)", ha='center', va='top', color='#94a3b8', fontsize=6.0, fontfamily='monospace', zorder=21)
    ax.text(half_w - 10.25, -half_h + 1.6, "ESCALATING ENEMY WAVES: 1 -> 2 -> 3 -> SWARM", ha='center', va='top', color='#10b981', fontsize=6.0, fontfamily='monospace', zorder=21)

    # 10. Compass & Scale Bar
    cx_pos = -half_w + 4.5
    cy_pos = half_h - 15.5
    ax.annotate("N", xy=(cx_pos, cy_pos + 1.6), xytext=(cx_pos, cy_pos), ha='center', va='bottom', color='#38bdf8', fontsize=11, weight='bold', arrowprops=dict(facecolor='#38bdf8', edgecolor='#0284c7', width=1.8, headwidth=6.0), zorder=20)
    ax.add_patch(patches.Circle((cx_pos, cy_pos), 1.1, fill=False, edgecolor='#0284c7', linestyle='--', zorder=20))

    sb_x = half_w - 19.5
    sb_y = half_h - 3.5
    ax.plot([sb_x, sb_x + 10.0], [sb_y, sb_y], color='#f0f9ff', lw=3.0, zorder=20)
    ax.plot([sb_x, sb_x], [sb_y - 0.4, sb_y + 0.4], color='#f0f9ff', lw=2.0, zorder=20)
    ax.plot([sb_x + 5.0, sb_x + 5.0], [sb_y - 0.3, sb_y + 0.3], color='#f0f9ff', lw=1.5, zorder=20)
    ax.plot([sb_x + 10.0, sb_x + 10.0], [sb_y - 0.4, sb_y + 0.4], color='#f0f9ff', lw=2.0, zorder=20)
    ax.text(sb_x + 5.0, sb_y + 0.6, "10 METERS", ha='center', va='bottom', color='#f0f9ff', fontsize=7.2, fontfamily='monospace', zorder=21)

    ax.set_xticks([])
    ax.set_yticks([])
    for spine in ax.spines.values():
        spine.set_color('#1e3a8a')
        spine.set_linewidth(1.5)

    plt.tight_layout()

    output_png_artifact = r"C:\Users\Asus\.gemini\antigravity-ide\brain\8a02f3c8-ee2f-4653-b8ba-0c0b7a722848\python_factory_2d_blueprint.png"
    output_png_public = r"c:\Users\Asus\OneDrive\Desktop\NSK mobile\NSK-Bearing-Challenge\public\images\python_factory_2d_blueprint.png"

    os.makedirs(os.path.dirname(output_png_public), exist_ok=True)
    plt.savefig(output_png_artifact, dpi=200, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.savefig(output_png_public, dpi=200, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close()
    print(f"[Python] Saved Blueprint to: {output_png_artifact}")
    print(f"[Python] Saved Blueprint to: {output_png_public}")


def export_layout_json():
    print("[Python] Exporting factoryLayout.json with 10 apps, 38 boxes, and enemy wave progression...")
    json_boxes = []
    for b in ALL_BOXES:
        json_boxes.append({
            "id": b["id"],
            "type": b["type"],
            "hasNskLogo": b["hasNskLogo"],
            "isInteractive": b["hasNskLogo"],
            "bearingDrop": 1 if b["hasNskLogo"] else 0,
            "x": b["x"],
            "z": -b["y"],  # 2D Y -> 3D Z
            "region": b["region"],
            "interactionRadius": 2.2 if b["hasNskLogo"] else 0.0
        })

    layout_data = {
        "arena": {
            "width": ARENA_WIDTH,
            "depth": ARENA_HEIGHT,
            "playerSpawn": {"x": 0.0, "z": 0.0},
            "floorColor": 0x091024,
            "wallColor": 0x1e3a8a
        },
        "machines": [
            {
                "id": m["id"],
                "name": m["name"],
                "type": m["type"],
                "x": m["x"],
                "z": -m["y"],
                "width": m["width"],
                "depth": m["height"],
                "color": m["color"],
                "repairRadius": 3.8,
                "desc": m["desc"]
            }
            for m in MACHINES
        ],
        "boxSummary": {
            "totalBoxes": len(json_boxes),
            "decoyCount": len([b for b in json_boxes if not b["hasNskLogo"]]),
            "nskLootCount": len([b for b in json_boxes if b["hasNskLogo"]]),
            "bearingPerBox": 1
        },
        "enemyWaves": ENEMY_WAVES,
        "crates": json_boxes
    }

    json_path = r"c:\Users\Asus\OneDrive\Desktop\NSK mobile\NSK-Bearing-Challenge\src\data\factoryLayout.json"
    os.makedirs(os.path.dirname(json_path), exist_ok=True)
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(layout_data, f, indent=2)

    print(f"[Python] Saved factoryLayout.json to: {json_path}")

if __name__ == "__main__":
    generate_blueprint()
    export_layout_json()
    print("[Python] Generation complete successfully!")
