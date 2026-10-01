import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

os.makedirs('docs_assets', exist_ok=True)

# Helper function to save figure cleanly
def save_fig(fig, filename):
    filepath = os.path.join('docs_assets', filename)
    fig.tight_layout()
    fig.savefig(filepath, dpi=200, bbox_inches='tight')
    plt.close(fig)
    print(f"Saved: {filepath}")

# 1. Functional Requirements Diagram
fig, ax = plt.subplots(figsize=(10, 6))
ax.set_xlim(0, 10)
ax.set_ylim(0, 7)
ax.axis('off')
ax.text(5, 6.5, "Extreme Sales & Services - Functional Requirements Decomposition", ha='center', va='center', fontsize=12, fontweight='bold', color='#1e3a8a')

modules = [
    ("FR-01: Service Booking Engine", "• Online AC service dispatch booking\n• Smart auto-detect AMC phone binding\n• Dynamic Request ID (AC-XXXX)\n• Instant SendGrid email confirmation", 0.5, 3.2),
    ("FR-02: Dispatch & Admin Portal", "• Live ticket queue & status filtering\n• Field technician assignment\n• Dynamic SLA & ticket triage\n• Real-time workforce management", 5.2, 3.2),
    ("FR-03: Field Technician Board", "• Mobile-responsive job console\n• Status patch (Pending->In Progress->Done)\n• Spare parts consumption logging\n• Customer address & contact view", 0.5, 0.4),
    ("FR-04: AMC & Catalog System", "• 3-tier contract plans (Eco, Comfort, Elite)\n• 1-year activation & visit decrement\n• AC product catalog (Split, Cassette, Used)\n• Sales consultation enquiry pipeline", 5.2, 0.4),
]

for title, desc, x, y in modules:
    rect = patches.FancyBboxPatch((x, y), 4.3, 2.3, boxstyle="round,pad=0.2", ec="#3b82f6", fc="#f0f7ff", lw=1.5)
    ax.add_patch(rect)
    ax.text(x + 0.2, y + 2.0, title, fontsize=9.5, fontweight='bold', color='#1e40af')
    ax.text(x + 0.2, y + 0.9, desc, fontsize=8, color='#334155', linespacing=1.3)

save_fig(fig, "img1_functional_reqs.png")

# 2. Non-Functional Requirements Framework
fig, ax = plt.subplots(figsize=(10, 5.5))
ax.set_xlim(0, 10)
ax.set_ylim(0, 6)
ax.axis('off')
ax.text(5, 5.5, "Non-Functional Quality Attributes (ISO/IEC 25010 Standard)", ha='center', va='center', fontsize=12, fontweight='bold', color='#0f172a')

nfrs = [
    ("Security & Privacy", "• JWT Token auth (RS256/HS256)\n• Bcrypt password hashing (10 salt rounds)\n• Strict RBAC (Admin, Staff, Tech)\n• CORS header sanitation", 0.3, 2.8, "#dbeafe", "#1e40af"),
    ("Performance & Latency", "• API latency < 120ms\n• SSE real-time updates < 250ms\n• Optimized JSON product catalogs\n• Lean vanilla JS bundle (< 80KB)", 5.2, 2.8, "#dcfce7", "#166534"),
    ("Reliability & Fallback", "• Cloud Firestore DB integration\n• Synchronized In-Memory fallback\n• 99.9% uptime fault tolerance\n• SendGrid retry handling", 0.3, 0.4, "#fef3c7", "#92400e"),
    ("Usability & Accessibility", "• 100% Mobile responsive layout\n• Live tracking progress timeline\n• Glassmorphic modern aesthetic\n• Accessible form validations", 5.2, 0.4, "#f3e8ff", "#6b21a8")
]

for title, desc, x, y, bg, fg in nfrs:
    rect = patches.FancyBboxPatch((x, y), 4.4, 2.0, boxstyle="round,pad=0.2", ec=fg, fc=bg, lw=1.5)
    ax.add_patch(rect)
    ax.text(x + 0.2, y + 1.6, title, fontsize=9.5, fontweight='bold', color=fg)
    ax.text(x + 0.2, y + 0.7, desc, fontsize=8, color='#334155', linespacing=1.3)

save_fig(fig, "img2_non_functional_reqs.png")

# 3. Context Diagram (Level 0 DFD)
fig, ax = plt.subplots(figsize=(10, 6))
ax.set_xlim(0, 10)
ax.set_ylim(0, 6.5)
ax.axis('off')
ax.text(5, 6.1, "Extreme Sales & Services - Level 0 Context DFD", ha='center', va='center', fontsize=12, fontweight='bold', color='#1e3a8a')

# Central Process
center = patches.Circle((5, 3.2), 1.2, ec="#1e40af", fc="#3b82f6", lw=2)
ax.add_patch(center)
ax.text(5, 3.4, "0.0\nExtreme Sales\n& Services", ha='center', va='center', fontsize=9.5, fontweight='bold', color='white')

# Entities
entities = [
    ("Customer", 0.8, 4.8),
    ("Field Technician", 8.2, 4.8),
    ("Admin / Dispatcher", 0.8, 1.2),
    ("SendGrid / Email", 8.2, 1.2)
]

for name, x, y in entities:
    r = patches.Rectangle((x-0.7, y-0.4), 1.6, 0.9, ec="#0f172a", fc="#f8fafc", lw=1.5)
    ax.add_patch(r)
    ax.text(x+0.1, y+0.05, name, ha='center', va='center', fontsize=8.5, fontweight='bold')

# Arrows
arrows = [
    ((1.7, 4.8), (3.9, 3.8), "Booking / Tracking Req"),
    ((3.8, 3.5), (1.7, 4.4), "Ticket Status / Receipt"),
    ((6.1, 3.8), (7.5, 4.8), "Assigned Jobs / Details"),
    ((7.5, 4.5), (6.2, 3.4), "Work Log / Parts Used"),
    ((1.7, 1.6), (3.9, 2.7), "Dispatch / Product Mgmt"),
    ((3.8, 2.5), (1.7, 1.2), "Analytics / Work Queue"),
    ((6.2, 2.7), (7.5, 1.6), "Notification Payloads"),
]

for start, end, label in arrows:
    ax.annotate("", xy=end, xytext=start, arrowprops=dict(arrowstyle="->", color="#475569", lw=1.2))

save_fig(fig, "img3_context_dfd.png")

# 4. Level 1 DFD
fig, ax = plt.subplots(figsize=(10, 6.5))
ax.set_xlim(0, 10)
ax.set_ylim(0, 7)
ax.axis('off')
ax.text(5, 6.6, "Level 1 Data Flow Diagram (Main Subsystems)", ha='center', va='center', fontsize=12, fontweight='bold', color='#1e3a8a')

processes = [
    ("1.0 Auth & Role Verification", 1.8, 5.0),
    ("2.0 Service Booking & AMC Check", 5.0, 5.0),
    ("3.0 Dispatch & Tech Assignment", 8.2, 5.0),
    ("4.0 Field Job Execution", 8.2, 2.2),
    ("5.0 AMC Contract Lifecycle", 5.0, 2.2),
    ("6.0 Catalog & BI Analytics", 1.8, 2.2)
]

for name, x, y in processes:
    p = patches.FancyBboxPatch((x-1.3, y-0.45), 2.6, 0.9, boxstyle="round,pad=0.15", ec="#2563eb", fc="#eff6ff", lw=1.5)
    ax.add_patch(p)
    ax.text(x, y, name, ha='center', va='center', fontsize=7.5, fontweight='bold', color='#1e40af')

# Data Stores
stores = [
    ("D1: service_requests", 5.0, 3.6),
    ("D2: customer_amc", 5.0, 0.8),
    ("D3: users / auth", 1.8, 3.6),
    ("D4: products / catalog", 1.8, 0.8)
]

for name, x, y in stores:
    ax.plot([x-1.1, x+1.1], [y+0.25, y+0.25], color='#475569', lw=1.5)
    ax.plot([x-1.1, x+1.1], [y-0.25, y-0.25], color='#475569', lw=1.5)
    ax.text(x, y, name, ha='center', va='center', fontsize=7.5, fontweight='bold', color='#0f172a')

# Flow links
ax.annotate("", xy=(3.6, 5.0), xytext=(3.2, 5.0), arrowprops=dict(arrowstyle="->", color="#2563eb", lw=1.2))
ax.annotate("", xy=(6.8, 5.0), xytext=(6.4, 5.0), arrowprops=dict(arrowstyle="->", color="#2563eb", lw=1.2))
ax.annotate("", xy=(8.2, 2.7), xytext=(8.2, 4.5), arrowprops=dict(arrowstyle="->", color="#2563eb", lw=1.2))
ax.annotate("", xy=(5.0, 3.9), xytext=(5.0, 4.5), arrowprops=dict(arrowstyle="->", color="#2563eb", lw=1.2))
ax.annotate("", xy=(5.0, 3.3), xytext=(5.0, 2.7), arrowprops=dict(arrowstyle="->", color="#2563eb", lw=1.2))

save_fig(fig, "img4_level1_dfd.png")

# 5. HIPO / Structured Chart
fig, ax = plt.subplots(figsize=(10, 5.5))
ax.set_xlim(0, 10)
ax.set_ylim(0, 6)
ax.axis('off')
ax.text(5, 5.6, "Hierarchical Structure Chart (HIPO Chart)", ha='center', va='center', fontsize=12, fontweight='bold', color='#0f172a')

# Root
r = patches.Rectangle((3.5, 4.5), 3.0, 0.7, ec="#1e40af", fc="#1e40af", lw=1.5)
ax.add_patch(r)
ax.text(5.0, 4.85, "Extreme Sales & Services Engine", ha='center', va='center', fontsize=8.5, fontweight='bold', color='white')

# Level 1 Modules
subs = [
    ("Auth Module", 1.2, 3.2),
    ("Service Booking", 3.2, 3.2),
    ("Dispatch & Fleet", 5.2, 3.2),
    ("AMC Contracts", 7.2, 3.2),
    ("BI Analytics", 9.0, 3.2)
]

for name, x, y in subs:
    sb = patches.Rectangle((x-0.8, y-0.3), 1.6, 0.6, ec="#2563eb", fc="#dbeafe", lw=1.2)
    ax.add_patch(sb)
    ax.text(x, y, name, ha='center', va='center', fontsize=7.5, fontweight='bold', color='#1e40af')
    ax.plot([5.0, x], [4.5, 3.5], color='#64748b', lw=1.2)

# Level 2 leaf functions
leafs = [
    ("Bcrypt Check\nJWT Issue", 1.2, 1.6),
    ("AMC Lookup\nID Gen (AC-X)", 3.2, 1.6),
    ("Workload Bal.\nStatus Patch", 5.2, 1.6),
    ("Plan Purchase\nRenew / Active", 7.2, 1.6),
    ("Revenue Calc\nChart.js Feed", 9.0, 1.6)
]

for name, x, y in leafs:
    lf = patches.Rectangle((x-0.8, y-0.4), 1.6, 0.8, ec="#94a3b8", fc="#f8fafc", lw=1)
    ax.add_patch(lf)
    ax.text(x, y, name, ha='center', va='center', fontsize=7, color='#334155')
    ax.plot([x, x], [2.9, 2.0], color='#94a3b8', lw=1)

save_fig(fig, "img5_hipo_chart.png")

# 6. Complete Use Case Diagram
fig, ax = plt.subplots(figsize=(10, 6.5))
ax.set_xlim(0, 10)
ax.set_ylim(0, 7)
ax.axis('off')
ax.text(5, 6.6, "System Use Case Model", ha='center', va='center', fontsize=12, fontweight='bold', color='#1e3a8a')

# Boundary
box = patches.Rectangle((2.3, 0.5), 5.4, 5.8, ec="#3b82f6", fc="#f8fafc", lw=1.5, ls="--")
ax.add_patch(box)
ax.text(5.0, 6.0, "Extreme Sales & Services System Boundary", ha='center', va='center', fontsize=8, fontstyle='italic', color='#64748b')

use_cases = [
    ("UC-01: Book Service / Repair", 5.0, 5.3),
    ("UC-02: Track Request via ID / Phone", 5.0, 4.6),
    ("UC-03: Browse Products & Inquire", 5.0, 3.9),
    ("UC-04: Purchase / Renew AMC Plan", 5.0, 3.2),
    ("UC-05: Assign Technician / Dispatch", 5.0, 2.5),
    ("UC-06: Update Job & Log Spare Parts", 5.0, 1.8),
    ("UC-07: View Financials & Analytics", 5.0, 1.1),
]

for name, x, y in use_cases:
    uc = patches.Ellipse((x, y), 3.2, 0.55, ec="#2563eb", fc="#eff6ff", lw=1.2)
    ax.add_patch(uc)
    ax.text(x, y, name, ha='center', va='center', fontsize=7.5, fontweight='bold', color='#1e40af')

# Actors
actors = [
    ("Customer", 1.0, 4.5),
    ("Staff / Dispatcher", 1.0, 2.0),
    ("Field Technician", 9.0, 2.0),
    ("Admin", 9.0, 4.5)
]

for name, x, y in actors:
    ax.plot([x], [y+0.3], marker='o', markersize=14, color='#1e293b')
    ax.plot([x, x], [y+0.2, y-0.2], color='#1e293b', lw=2)
    ax.plot([x-0.25, x+0.25], [y+0.05, y+0.05], color='#1e293b', lw=2)
    ax.plot([x, x-0.2], [y-0.2, y-0.45], color='#1e293b', lw=2)
    ax.plot([x, x+0.2], [y-0.2, y-0.45], color='#1e293b', lw=2)
    ax.text(x, y-0.65, name, ha='center', va='center', fontsize=7.5, fontweight='bold')

# Association lines
ax.plot([1.2, 3.4], [4.5, 5.3], color='#64748b', lw=1)
ax.plot([1.2, 3.4], [4.5, 4.6], color='#64748b', lw=1)
ax.plot([1.2, 3.4], [4.5, 3.9], color='#64748b', lw=1)
ax.plot([1.2, 3.4], [4.5, 3.2], color='#64748b', lw=1)

ax.plot([1.2, 3.4], [2.0, 2.5], color='#64748b', lw=1)
ax.plot([8.8, 6.6], [2.0, 1.8], color='#64748b', lw=1)
ax.plot([8.8, 6.6], [4.5, 2.5], color='#64748b', lw=1)
ax.plot([8.8, 6.6], [4.5, 1.1], color='#64748b', lw=1)

save_fig(fig, "img6_use_case.png")

# 7. Class Diagram
fig, ax = plt.subplots(figsize=(10, 6.5))
ax.set_xlim(0, 10)
ax.set_ylim(0, 7)
ax.axis('off')
ax.text(5, 6.7, "Domain Class Diagram", ha='center', va='center', fontsize=12, fontweight='bold', color='#1e3a8a')

classes = [
    ("User", "• id: string\n• name: string\n• email: string\n• role: enum\n• phone: string\n───────────────\n+ login(pw): Token\n+ verifyRole(): bool", 0.5, 4.0),
    ("ServiceRequest", "• request_id: string\n• name, phone, email\n• service_type: string\n• status: StatusEnum\n• technician_id: string\n───────────────\n+ book(): RequestId\n+ assign(techId): void\n+ updateStatus(): void", 3.7, 3.8),
    ("AMCSubscription", "• id: string\n• customer_name: string\n• phone: string\n• plan_name: string\n• remaining_services: int\n───────────────\n+ activate(duration)\n+ decrementVisit()", 7.2, 4.0),
    ("Product", "• id: string\n• name: string\n• category: string\n• price, stock: float\n───────────────\n+ updateStock()\n+ filterCategory()", 1.5, 0.5),
    ("AMCPlan", "• id: string\n• name: string\n• price: float\n• services_per_yr: int\n───────────────\n+ getFeatures()", 7.2, 0.5),
]

for title, desc, x, y in classes:
    rect = patches.Rectangle((x, y), 2.5, 2.4, ec="#1e40af", fc="#f8fafc", lw=1.2)
    ax.add_patch(rect)
    header = patches.Rectangle((x, y+1.9), 2.5, 0.5, ec="#1e40af", fc="#1e40af", lw=1.2)
    ax.add_patch(header)
    ax.text(x+1.25, y+2.15, title, ha='center', va='center', fontsize=8.5, fontweight='bold', color='white')
    ax.text(x+0.1, y+0.9, desc, fontsize=6.8, color='#0f172a', linespacing=1.2)

# Multiplicities
ax.annotate("", xy=(3.7, 5.0), xytext=(3.0, 5.0), arrowprops=dict(arrowstyle="->", color="#475569", lw=1.2))
ax.text(3.1, 5.15, "1", fontsize=7, fontweight='bold')
ax.text(3.5, 5.15, "0..*", fontsize=7, fontweight='bold')

ax.annotate("", xy=(6.2, 5.0), xytext=(7.2, 5.0), arrowprops=dict(arrowstyle="->", color="#475569", lw=1.2))
ax.text(7.0, 5.15, "0..1", fontsize=7, fontweight='bold')
ax.text(6.4, 5.15, "0..*", fontsize=7, fontweight='bold')

save_fig(fig, "img7_class_diagram.png")

# 8. Object Diagram
fig, ax = plt.subplots(figsize=(10, 5.5))
ax.set_xlim(0, 10)
ax.set_ylim(0, 6)
ax.axis('off')
ax.text(5, 5.6, "System Object Diagram (Runtime Instance Snapshot)", ha='center', va='center', fontsize=12, fontweight='bold', color='#1e3a8a')

objs = [
    ("admin1: User", "id = 'usr-admin'\nname = 'Vikram Malhotra'\nrole = 'admin'\nphone = '9820011000'", 0.5, 3.2),
    ("tech1: User", "id = 'tech-1'\nname = 'Suresh Kumar'\nrole = 'technician'\nphone = '9820011223'", 0.5, 0.5),
    ("req1001: ServiceRequest", "request_id = 'AC-1001'\nname = 'Rahul Sharma'\nstatus = 'In Progress'\nservice_type = 'AC Repair'\ntech_id = 'tech-1'", 4.2, 1.8),
    ("amcSub2: AMCSubscription", "id = 'sub-2'\ncustomer = 'Anjali Gupta'\nplan = 'Elite Ultimate'\nstatus = 'Active'\nremaining_visits = 4", 7.5, 1.8)
]

for title, desc, x, y in objs:
    rect = patches.Rectangle((x, y), 2.2, 1.8, ec="#0284c7", fc="#f0f9ff", lw=1.2)
    ax.add_patch(rect)
    hdr = patches.Rectangle((x, y+1.35), 2.2, 0.45, ec="#0284c7", fc="#0284c7", lw=1.2)
    ax.add_patch(hdr)
    ax.text(x+1.1, y+1.58, title, ha='center', va='center', fontsize=7.5, fontweight='bold', color='white')
    ax.text(x+0.1, y+0.65, desc, fontsize=6.8, color='#0f172a', linespacing=1.2)

ax.plot([2.7, 4.2], [1.4, 2.7], color='#64748b', lw=1.2, ls="--")
ax.plot([6.4, 7.5], [2.7, 2.7], color='#64748b', lw=1.2, ls="--")

save_fig(fig, "img8_object_diagram.png")

# 9. State Chart
fig, ax = plt.subplots(figsize=(10, 5))
ax.set_xlim(0, 10)
ax.set_ylim(0, 5)
ax.axis('off')
ax.text(5, 4.6, "Service Request Lifecycle State Machine", ha='center', va='center', fontsize=12, fontweight='bold', color='#1e3a8a')

# Start Circle
start = patches.Circle((0.8, 2.5), 0.25, fc="#0f172a")
ax.add_patch(start)

states = [
    ("Pending", 2.3, 2.5, "#fef3c7", "#d97706"),
    ("Assigned", 4.7, 2.5, "#dbeafe", "#2563eb"),
    ("In Progress", 7.1, 2.5, "#ede9fe", "#7c3aed"),
    ("Completed", 9.2, 2.5, "#dcfce7", "#16a34a"),
    ("Cancelled", 4.7, 0.8, "#fee2e2", "#dc2626")
]

for name, x, y, bg, fg in states:
    s = patches.FancyBboxPatch((x-0.7, y-0.4), 1.4, 0.8, boxstyle="round,pad=0.15", ec=fg, fc=bg, lw=1.5)
    ax.add_patch(s)
    ax.text(x, y, name, ha='center', va='center', fontsize=8, fontweight='bold', color=fg)

# Transitions
ax.annotate("", xy=(1.6, 2.5), xytext=(1.05, 2.5), arrowprops=dict(arrowstyle="->", color="#475569", lw=1.2))
ax.annotate("booking submitted", xy=(1.9, 2.8), fontsize=6.5, ha='center')

ax.annotate("", xy=(4.0, 2.5), xytext=(3.0, 2.5), arrowprops=dict(arrowstyle="->", color="#475569", lw=1.2))
ax.annotate("assign technician", xy=(3.5, 2.8), fontsize=6.5, ha='center')

ax.annotate("", xy=(6.4, 2.5), xytext=(5.4, 2.5), arrowprops=dict(arrowstyle="->", color="#475569", lw=1.2))
ax.annotate("tech arrives on site", xy=(5.9, 2.8), fontsize=6.5, ha='center')

ax.annotate("", xy=(8.5, 2.5), xytext=(7.8, 2.5), arrowprops=dict(arrowstyle="->", color="#475569", lw=1.2))
ax.annotate("repair verified", xy=(8.1, 2.8), fontsize=6.5, ha='center')

ax.annotate("", xy=(4.7, 1.2), xytext=(4.7, 2.1), arrowprops=dict(arrowstyle="->", color="#dc2626", lw=1.2))
ax.annotate("client cancel", xy=(5.2, 1.6), fontsize=6.5, color='#dc2626')

save_fig(fig, "img9_state_chart.png")

# 10. User Auth Activity Diagram
fig, ax = plt.subplots(figsize=(10, 6))
ax.set_xlim(0, 10)
ax.set_ylim(0, 6.5)
ax.axis('off')
ax.text(5, 6.2, "User Authentication & RBAC Activity Diagram", ha='center', va='center', fontsize=12, fontweight='bold', color='#1e3a8a')

nodes = [
    ("Submit Email & Password", 5.0, 5.3, "rect"),
    ("Query User by Email", 5.0, 4.3, "rect"),
    ("User Exists?", 5.0, 3.2, "diamond"),
    ("Verify Bcrypt Password Hash", 7.5, 3.2, "rect"),
    ("Password Match?", 7.5, 2.0, "diamond"),
    ("Generate JWT Token\n(Role Claim)", 7.5, 0.8, "rect"),
    ("Return 401 Unauthorized", 2.5, 2.0, "rect"),
]

for name, x, y, kind in nodes:
    if kind == "rect":
        b = patches.FancyBboxPatch((x-1.3, y-0.35), 2.6, 0.7, boxstyle="round,pad=0.1", ec="#2563eb", fc="#eff6ff", lw=1.2)
        ax.add_patch(b)
        ax.text(x, y, name, ha='center', va='center', fontsize=7.5, color='#1e40af', fontweight='bold')
    else:
        d = patches.Polygon([[x, y+0.45], [x+1.1, y], [x, y-0.45], [x-1.1, y]], closed=True, ec="#d97706", fc="#fef3c7", lw=1.2)
        ax.add_patch(d)
        ax.text(x, y, name, ha='center', va='center', fontsize=7, color='#b45309', fontweight='bold')

ax.annotate("", xy=(5.0, 4.65), xytext=(5.0, 4.95), arrowprops=dict(arrowstyle="->", lw=1.2))
ax.annotate("", xy=(5.0, 3.65), xytext=(5.0, 3.95), arrowprops=dict(arrowstyle="->", lw=1.2))
ax.annotate("Yes", xy=(6.2, 3.2), xytext=(6.1, 3.2), arrowprops=dict(arrowstyle="->", lw=1.2))
ax.annotate("No", xy=(3.8, 3.2), xytext=(3.9, 3.2), arrowprops=dict(arrowstyle="->", lw=1.2))
ax.plot([3.8, 2.5], [3.2, 3.2], color='#475569')
ax.annotate("", xy=(2.5, 2.35), xytext=(2.5, 3.2), arrowprops=dict(arrowstyle="->", lw=1.2))
ax.annotate("", xy=(7.5, 2.45), xytext=(7.5, 2.85), arrowprops=dict(arrowstyle="->", lw=1.2))
ax.annotate("Yes", xy=(7.5, 1.2), xytext=(7.5, 1.55), arrowprops=dict(arrowstyle="->", lw=1.2))

save_fig(fig, "img10_auth_activity.png")

# 11. Booking Activity Diagram
fig, ax = plt.subplots(figsize=(10, 6))
ax.set_xlim(0, 10)
ax.set_ylim(0, 6.5)
ax.axis('off')
ax.text(5, 6.2, "Service Booking & AMC Auto-Deduction Activity Diagram", ha='center', va='center', fontsize=12, fontweight='bold', color='#1e3a8a')

b_nodes = [
    ("Customer Submits Booking Form", 5.0, 5.4),
    ("Lookup customer_amc by Phone", 5.0, 4.5),
    ("Active Subscription with Visits > 0?", 5.0, 3.4),
    ("Auto-Decrement Remaining Visits\nAppend '[✅ AMC Covered]' Tag", 8.0, 2.2),
    ("Create Service Ticket as 'Pending'\nGenerate Random ID 'AC-XXXX'", 5.0, 1.8),
    ("Trigger SendGrid Confirmation Email", 5.0, 0.7)
]

for name, x, y in b_nodes:
    if "?" in name:
        d = patches.Polygon([[x, y+0.45], [x+1.8, y], [x, y-0.45], [x-1.8, y]], closed=True, ec="#0284c7", fc="#e0f2fe", lw=1.2)
        ax.add_patch(d)
        ax.text(x, y, name, ha='center', va='center', fontsize=7, color='#0369a1', fontweight='bold')
    else:
        b = patches.FancyBboxPatch((x-1.6, y-0.35), 3.2, 0.7, boxstyle="round,pad=0.1", ec="#16a34a", fc="#f0fdf4", lw=1.2)
        ax.add_patch(b)
        ax.text(x, y, name, ha='center', va='center', fontsize=7.2, color='#15803d', fontweight='bold')

ax.annotate("", xy=(5.0, 4.85), xytext=(5.0, 5.05), arrowprops=dict(arrowstyle="->", lw=1.2))
ax.annotate("", xy=(5.0, 3.85), xytext=(5.0, 4.15), arrowprops=dict(arrowstyle="->", lw=1.2))
ax.annotate("Yes", xy=(6.8, 3.4), xytext=(6.5, 3.4), arrowprops=dict(arrowstyle="->", lw=1.2))
ax.plot([6.8, 8.0], [3.4, 3.4], color='#475569')
ax.annotate("", xy=(8.0, 2.55), xytext=(8.0, 3.4), arrowprops=dict(arrowstyle="->", lw=1.2))
ax.annotate("No", xy=(5.0, 2.2), xytext=(5.0, 2.95), arrowprops=dict(arrowstyle="->", lw=1.2))
ax.annotate("", xy=(5.0, 1.1), xytext=(5.0, 1.45), arrowprops=dict(arrowstyle="->", lw=1.2))

save_fig(fig, "img11_booking_activity.png")

# 12. Sequence Diagram 1: Booking Flow
fig, ax = plt.subplots(figsize=(10, 6))
ax.set_xlim(0, 10)
ax.set_ylim(0, 6.5)
ax.axis('off')
ax.text(5, 6.2, "Service Booking & Confirmation Sequence Diagram", ha='center', va='center', fontsize=12, fontweight='bold', color='#1e3a8a')

lifelines = [
    ("Customer", 1.2),
    ("Browser UI", 3.2),
    ("Express Server", 5.5),
    ("Firestore DB", 7.5),
    ("SendGrid API", 9.2)
]

for name, x in lifelines:
    r = patches.Rectangle((x-0.8, 5.3), 1.6, 0.5, ec="#1e40af", fc="#1e40af")
    ax.add_patch(r)
    ax.text(x, 5.55, name, ha='center', va='center', fontsize=7.5, fontweight='bold', color='white')
    ax.plot([x, x], [5.3, 0.5], color='#94a3b8', ls="--", lw=1)

# Sequence messages
seq_msgs = [
    (1.2, 3.2, 4.8, "1. submit booking form", "->"),
    (3.2, 5.5, 4.3, "2. POST /api/services", "->"),
    (5.5, 7.5, 3.8, "3. Query customer_amc", "->"),
    (7.5, 5.5, 3.4, "4. Return AMC balance", "-->"),
    (5.5, 7.5, 2.9, "5. Write service_requests doc", "->"),
    (5.5, 9.2, 2.4, "6. sendBookingEmail()", "->"),
    (5.5, 3.2, 1.8, "7. HTTP 201 {requestId}", "-->"),
    (3.2, 1.2, 1.3, "8. Render confirmation & tracking link", "-->")
]

for x1, x2, y, text, style in seq_msgs:
    ls = "--" if style == "-->" else "-"
    ax.annotate("", xy=(x2, y), xytext=(x1, y), arrowprops=dict(arrowstyle="->", linestyle=ls, color="#0f172a", lw=1.2))
    ax.text((x1+x2)/2, y+0.12, text, ha='center', va='center', fontsize=7, color='#1e40af')

save_fig(fig, "img12_booking_sequence.png")

# 13. Sequence Diagram 2: Dispatch Flow
fig, ax = plt.subplots(figsize=(10, 6))
ax.set_xlim(0, 10)
ax.set_ylim(0, 6.5)
ax.axis('off')
ax.text(5, 6.2, "Technician Dispatch & Job Execution Sequence Diagram", ha='center', va='center', fontsize=12, fontweight='bold', color='#1e3a8a')

t_lifelines = [
    ("Admin / Staff", 1.2),
    ("Express Server", 3.8),
    ("Firestore DB", 6.2),
    ("Technician Portal", 8.8)
]

for name, x in t_lifelines:
    r = patches.Rectangle((x-0.9, 5.3), 1.8, 0.5, ec="#0f766e", fc="#0f766e")
    ax.add_patch(r)
    ax.text(x, 5.55, name, ha='center', va='center', fontsize=7.5, fontweight='bold', color='white')
    ax.plot([x, x], [5.3, 0.5], color='#94a3b8', ls="--", lw=1)

t_msgs = [
    (1.2, 3.8, 4.7, "1. PATCH /api/admin/assign-technician", "->"),
    (3.8, 6.2, 4.2, "2. Update doc {techId, status: 'Assigned'}", "->"),
    (8.8, 3.8, 3.6, "3. GET /api/technician/jobs", "->"),
    (3.8, 8.8, 3.1, "4. Return assigned job list", "-->"),
    (8.8, 3.8, 2.4, "5. PATCH /api/admin/update-status {Completed, notes}", "->"),
    (3.8, 6.2, 1.8, "6. Update doc {status: 'Completed', notes}", "->"),
    (3.8, 1.2, 1.2, "7. Broadcast SSE update to live tracking", "-->")
]

for x1, x2, y, text, style in t_msgs:
    ls = "--" if style == "-->" else "-"
    ax.annotate("", xy=(x2, y), xytext=(x1, y), arrowprops=dict(arrowstyle="->", linestyle=ls, color="#0f172a", lw=1.2))
    ax.text((x1+x2)/2, y+0.12, text, ha='center', va='center', fontsize=7, color='#0f766e')

save_fig(fig, "img13_dispatch_sequence.png")

# 14. Collaboration Diagram
fig, ax = plt.subplots(figsize=(10, 5.5))
ax.set_xlim(0, 10)
ax.set_ylim(0, 6)
ax.axis('off')
ax.text(5, 5.6, "AMC Auto-Deduction Collaboration Diagram", ha='center', va='center', fontsize=12, fontweight='bold', color='#1e3a8a')

c_objs = [
    (":Customer", 1.5, 3.5),
    (":BookingController", 5.0, 3.5),
    (":AMCService", 8.5, 3.5),
    (":FirestoreDB", 5.0, 1.0)
]

for name, x, y in c_objs:
    r = patches.Rectangle((x-1.0, y-0.4), 2.0, 0.8, ec="#2563eb", fc="#eff6ff", lw=1.5)
    ax.add_patch(r)
    ax.text(x, y, name, ha='center', va='center', fontsize=8, fontweight='bold', color='#1e40af')

ax.plot([2.5, 4.0], [3.5, 3.5], color='#475569', lw=1.5)
ax.text(3.25, 3.8, "1: submitBooking() →", fontsize=7, color='#0f172a')

ax.plot([6.0, 7.5], [3.5, 3.5], color='#475569', lw=1.5)
ax.text(6.75, 3.8, "2: verifyAndDeduct() →", fontsize=7, color='#0f172a')

ax.plot([5.0, 5.0], [3.1, 1.4], color='#475569', lw=1.5)
ax.text(5.2, 2.2, "3: updateDoc() ↓\n4: ack ↑", fontsize=7, color='#0f172a')

save_fig(fig, "img14_amc_collaboration.png")

# 15. Component Diagram
fig, ax = plt.subplots(figsize=(10, 6))
ax.set_xlim(0, 10)
ax.set_ylim(0, 6.5)
ax.axis('off')
ax.text(5, 6.2, "System Component Architecture", ha='center', va='center', fontsize=12, fontweight='bold', color='#1e3a8a')

comps = [
    ("Presentation Tier", "• Client Web Pages (HTML5/CSS3)\n• Chart.js Interactive Dashboards\n• EventSource SSE Live Tracker\n• Responsive Mobile Viewport", 0.5, 3.5),
    ("Application Service Tier", "• Express 5.x REST Routing Layer\n• JWT & Bcrypt Auth Middleware\n• SendGrid Mail Dispatch Service\n• Dual-Mode State Orchestrator", 3.8, 3.5),
    ("Persistence & Cloud Tier", "• Google Firebase Cloud Firestore\n• Local Synchronized Mock Memory\n• JSON Local Product Catalog\n• SendGrid SMTP Gateway", 7.1, 3.5)
]

for title, desc, x, y in comps:
    rect = patches.FancyBboxPatch((x, y), 2.5, 2.2, boxstyle="round,pad=0.2", ec="#1e40af", fc="#f8fafc", lw=1.5)
    ax.add_patch(rect)
    ax.text(x+0.1, y+1.9, title, fontsize=8.5, fontweight='bold', color='#1e40af')
    ax.text(x+0.1, y+0.7, desc, fontsize=7.2, color='#334155', linespacing=1.3)

ax.annotate("", xy=(3.8, 4.6), xytext=(3.0, 4.6), arrowprops=dict(arrowstyle="<->", color="#2563eb", lw=1.5))
ax.text(3.4, 4.8, "HTTP/REST", fontsize=6.5, ha='center')

ax.annotate("", xy=(7.1, 4.6), xytext=(6.3, 4.6), arrowprops=dict(arrowstyle="<->", color="#2563eb", lw=1.5))
ax.text(6.7, 4.8, "gRPC / SDK", fontsize=6.5, ha='center')

save_fig(fig, "img15_component_diagram.png")

# 16. Deployment Diagram
fig, ax = plt.subplots(figsize=(10, 5.5))
ax.set_xlim(0, 10)
ax.set_ylim(0, 6)
ax.axis('off')
ax.text(5, 5.6, "System Deployment Topology", ha='center', va='center', fontsize=12, fontweight='bold', color='#1e3a8a')

nodes_dep = [
    ("<<Client Device>>\nDesktop / Mobile Browser", 0.6, 2.5),
    ("<<Cloud Application Node>>\nNode.js / Express Server", 4.0, 2.5),
    ("<<BaaS Cloud Infrastructure>>\nGoogle Cloud Firebase Firestore", 7.4, 3.8),
    ("<<External SaaS>>\nSendGrid Email API", 7.4, 1.2)
]

for name, x, y in nodes_dep:
    cube = patches.Rectangle((x, y), 2.2, 1.6, ec="#334155", fc="#f1f5f9", lw=1.5)
    ax.add_patch(cube)
    ax.text(x+1.1, y+0.8, name, ha='center', va='center', fontsize=7.5, fontweight='bold', color='#0f172a')

ax.annotate("", xy=(4.0, 3.3), xytext=(2.8, 3.3), arrowprops=dict(arrowstyle="<->", color="#3b82f6", lw=1.5))
ax.text(3.4, 3.5, "HTTPS (Port 443)", fontsize=6.5, ha='center')

ax.annotate("", xy=(7.4, 4.6), xytext=(6.2, 3.7), arrowprops=dict(arrowstyle="<->", color="#3b82f6", lw=1.5))
ax.text(6.8, 4.3, "TLS / API Key", fontsize=6.5, ha='center')

ax.annotate("", xy=(7.4, 2.0), xytext=(6.2, 2.9), arrowprops=dict(arrowstyle="->", color="#3b82f6", lw=1.5))
ax.text(6.8, 2.3, "REST v3", fontsize=6.5, ha='center')

save_fig(fig, "img16_deployment_diagram.png")

# 17. Dual Mode Architecture Diagram
fig, ax = plt.subplots(figsize=(10, 5.5))
ax.set_xlim(0, 10)
ax.set_ylim(0, 6)
ax.axis('off')
ax.text(5, 5.6, "Dual-Mode Hybrid Persistence Architecture", ha='center', va='center', fontsize=12, fontweight='bold', color='#1e3a8a')

box_arch = patches.Rectangle((1.0, 1.0), 8.0, 4.0, ec="#64748b", fc="#f8fafc", lw=1.5, ls="--")
ax.add_patch(box_arch)
ax.text(5.0, 4.7, "Server Runtime Environment (server.js)", ha='center', va='center', fontsize=9, fontweight='bold', color='#475569')

mode1 = patches.FancyBboxPatch((1.5, 1.6), 3.2, 2.6, boxstyle="round,pad=0.2", ec="#16a34a", fc="#f0fdf4", lw=1.5)
ax.add_patch(mode1)
ax.text(3.1, 3.8, "Production Cloud Mode", ha='center', va='center', fontsize=8.5, fontweight='bold', color='#15803d')
ax.text(1.7, 2.5, "• Firebase Service Account cert\n• Firestore Cloud NoSQL DB\n• SendGrid production transactional\n• Persistent enterprise store", fontsize=7.2, color='#166534', linespacing=1.3)

mode2 = patches.FancyBboxPatch((5.3, 1.6), 3.2, 2.6, boxstyle="round,pad=0.2", ec="#d97706", fc="#fffbeb", lw=1.5)
ax.add_patch(mode2)
ax.text(6.9, 3.8, "Local Synchronized Mock Mode", ha='center', va='center', fontsize=8.5, fontweight='bold', color='#b45309')
ax.text(5.5, 2.5, "• Zero cloud credential dependency\n• Synchronized In-Memory arrays\n• Instant dev startup on :5000\n• Full ticket & AMC lifecycle parity", fontsize=7.2, color='#92400e', linespacing=1.3)

save_fig(fig, "img17_infrastructure_diagram.png")

# 18. Gantt Chart
fig, ax = plt.subplots(figsize=(10, 5.5))
tasks = [
    "Requirements & Domain Analysis",
    "System Architecture & UML Design",
    "Frontend Portal Development",
    "Backend REST API & Auth Engine",
    "AMC & Dispatch Workflows",
    "Integration & Security Testing",
    "Final Deployment & Academic Review"
]
start_weeks = [1, 3, 5, 6, 9, 12, 14]
durations =   [2, 3, 4, 4, 3,  3,  2]
colors = ['#3b82f6', '#0284c7', '#0d9488', '#16a34a', '#eab308', '#f97316', '#6366f1']

y_pos = np.arange(len(tasks))
ax.barh(y_pos, durations, left=start_weeks, align='center', color=colors, edgecolor='#0f172a', height=0.55)
ax.set_yticks(y_pos)
ax.set_yticklabels(tasks, fontsize=8.5, fontweight='bold')
ax.invert_yaxis()
ax.set_xlabel('Project Timeline (Weeks 1 to 16)', fontsize=9, fontweight='bold')
ax.set_xlim(0, 17)
ax.set_xticks(range(1, 17))
ax.grid(axis='x', linestyle=':', alpha=0.6)
ax.set_title("16-Week Project Gantt Chart Schedule", fontsize=11, fontweight='bold', color='#1e3a8a')

save_fig(fig, "img18_gantt_chart.png")

# 19. PERT / CPM Chart
fig, ax = plt.subplots(figsize=(10, 5))
ax.set_xlim(0, 10)
ax.set_ylim(0, 5)
ax.axis('off')
ax.text(5, 4.6, "PERT Network & Critical Path Method (CPM)", ha='center', va='center', fontsize=12, fontweight='bold', color='#1e3a8a')

nodes_pert = [
    ("1\nStart", 0.8, 2.5),
    ("2\nAnalysis\n(2 wks)", 2.4, 2.5),
    ("3\nDesign\n(3 wks)", 4.0, 2.5),
    ("4\nDev Backend\n(4 wks)", 6.0, 3.4),
    ("5\nDev Frontend\n(4 wks)", 6.0, 1.6),
    ("6\nTesting\n(3 wks)", 8.0, 2.5),
    ("7\nDeploy\n(2 wks)", 9.5, 2.5),
]

for name, x, y in nodes_pert:
    c = patches.Circle((x, y), 0.45, ec="#dc2626" if "Dev Frontend" not in name else "#475569", fc="#fee2e2" if "Dev Frontend" not in name else "#f1f5f9", lw=1.5)
    ax.add_patch(c)
    ax.text(x, y, name, ha='center', va='center', fontsize=6.5, fontweight='bold', color='#991b1b' if "Dev Frontend" not in name else "#334155")

# Critical path arrows (Red)
crit_edges = [
    ((1.25, 2.5), (1.95, 2.5)),
    ((2.85, 2.5), (3.55, 2.5)),
    ((4.45, 2.65), (5.55, 3.25)),
    ((6.45, 3.25), (7.55, 2.65)),
    ((8.45, 2.5), (9.05, 2.5)),
]
for p1, p2 in crit_edges:
    ax.annotate("", xy=p2, xytext=p1, arrowprops=dict(arrowstyle="->", color="#dc2626", lw=2))

# Non-critical arrow
ax.annotate("", xy=(5.55, 1.75), xytext=(4.45, 2.35), arrowprops=dict(arrowstyle="->", color="#64748b", lw=1.2, ls="--"))
ax.annotate("", xy=(7.55, 2.35), xytext=(6.45, 1.75), arrowprops=dict(arrowstyle="->", color="#64748b", lw=1.2, ls="--"))

ax.text(5.0, 0.4, "CRITICAL PATH: 1 → 2 → 3 → 4 → 6 → 7 (Total Expected Duration = 16 Weeks)", ha='center', va='center', fontsize=8, fontweight='bold', color='#dc2626')

save_fig(fig, "img19_pert_chart.png")

# 20. Testing Metrics Chart
fig, ax = plt.subplots(figsize=(8, 4.5))
categories = ['Unit Testing\n(White Box)', 'Integration\n(Black Box)', 'Boundary\nValue', 'Security\n(OWASP)', 'Usability &\nResponsive']
executed = [10, 8, 6, 6, 6]
passed =   [10, 8, 6, 6, 6]

x = np.arange(len(categories))
width = 0.35

ax.bar(x - width/2, executed, width, label='Tests Executed', color='#94a3b8')
ax.bar(x + width/2, passed, width, label='Tests Passed (100%)', color='#10b981')

ax.set_ylabel('Number of Test Cases', fontsize=9, fontweight='bold')
ax.set_title('Test Execution & Verification Summary (Total: 36 Tests)', fontsize=11, fontweight='bold', color='#1e3a8a')
ax.set_xticks(x)
ax.set_xticklabels(categories, fontsize=8)
ax.legend(frameon=True, facecolor='white', loc='upper right')
ax.set_ylim(0, 12)
ax.grid(axis='y', linestyle=':', alpha=0.7)

for i in range(len(categories)):
    ax.text(x[i] - width/2, executed[i] + 0.3, str(executed[i]), ha='center', fontsize=8, fontweight='bold', color='#475569')
    ax.text(x[i] + width/2, passed[i] + 0.3, str(passed[i]), ha='center', fontsize=8, fontweight='bold', color='#047857')

save_fig(fig, "img20_testing_metrics.png")

print("All 20 diagrams generated successfully in docs_assets/!")
