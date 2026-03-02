🩸 BloodLink
Regional Blood Availability Coordination System (Prototype)
BloodLink is a secure, hospital-admin web application designed to help blood bank staff identify nearby facilities with likely availability of specific blood types and components.
It is built to reduce the burden placed on patient relatives who are often forced to physically search multiple hospitals when blood is unavailable at the admitting facility.
This system is designed for internal hospital coordination — not public access.

---

🚨 Problem Statement
In many regions, when a hospital lacks a required blood type (e.g., 2 units of O+ RBC), patient relatives are instructed to visit other hospitals or organizations such as the Philippine Red Cross to check availability.
This leads to:
• Travel delays
• Traffic-related inefficiencies
• Emotional stress
• Time-sensitive risk for critical patients
• Lack of visibility into real-time availability
BloodLink aims to streamline this process by enabling hospital staff to check estimated availability across participating facilities before directing families elsewhere.

---

🎯 Project Goal
To provide a structured, secure, and safety-aware platform for inter-hospital blood availability coordination while maintaining medical responsibility and compliance awareness.

---

🏥 Target Users
• Super Admin (System Owner)
• Hospital Administrator
• Blood Bank Staff
• Read-Only Viewer (Authorized Personnel)
Public users do not have access to inventory data.

---

🧩 Core Features
🔐 Role-Based Access Control (RBAC)
Strict permissions system:
• Only authorized hospital staff can update inventory
• Only admins can manage facilities
• All actions are audit logged

---

🩸 Blood Inventory Dashboard
Each participating hospital maintains:
• Component type (RBC, Platelets, Plasma)
• ABO group (A, B, AB, O)
• Rh factor (+ / -)
• Internal unit count
• Auto-computed availability status:
o 🟢 Adequate
o 🟡 Low
o 🔴 Critical
o ⚫ None
Exact counts are visible only to authorized internal users.

_______________
🔎 Smart Blood Search
Admins can search by:
•	Component type
•	ABO group
•	Rh factor
•	Urgency level
Results include:
•	Nearby hospitals (sorted by distance)
•	Availability status
•	Last update timestamp
•	Contact details

📩 Digital Availability Inquiry
Instead of sending families blindly:
•	Send structured availability inquiry
•	Receiving hospital confirms:
o	Available
o	Limited
o	Not Available
•	All responses are timestamped and logged
________________________________________
📍 Geo-Based Sorting
Hospitals are ranked by proximity using stored latitude/longitude coordinates.
________________________________________
⏳ Data Freshness Protection
If a facility hasn’t updated inventory within a defined timeframe:
•	Status is marked as “Unverified”
•	Staff are alerted
________________________________________
🗂 Audit Logging
All system actions are logged:
•	Inventory updates
•	Search queries
•	Request submissions
•	Response confirmations
________________________________________
🏗 Tech Stack
Frontend:
•	Next.js 15
•	Tailwind CSS

Styling: 
Deep crimson red (#DC2626) as primary accent, soft whites and light grays for breathing room, dark slate for text
Style: Medical-grade elegance with rounded cards, subtle shadows, smooth micro-interactions
Typography: Clean, modern Inter-style system fonts
Feel: Trustworthy, urgent yet calm, professional healthcare aesthetic
shadcn/ui (component library built on Radix UI)

Animation: Framer Motion

Backend:
•	Django REST Framework
•	PostgreSQL
Architecture Features:
•	RESTful API
•	Indexed search (ABO/Rh/component)
•	Geo-distance calculation
•	Soft deletes
•	Audit logging
•	Secure authentication (JWT or session-based)
________________________________________
⚠️ Important Disclaimer
BloodLink is a prototype coordination tool and does not:
•	Replace hospital LIS systems
•	Perform crossmatching
•	Guarantee blood reservation
•	Provide public real-time blood inventory
•	Replace official regulatory systems under the Department of Health
All transfusion decisions must follow licensed medical protocols.



Database Schema Design
Now let’s design this properly.
Below is a clean, scalable schema.

---

🧱 Core Tables
User

---

id (PK)
email (unique)
password_hash
full_name
role (super_admin, hospital_admin, staff, viewer)
hospital_id (FK nullable)
is_active
created_at
updated_at

## Hospital

id (PK)
name
address
city
contact_number
blood_bank_license_number
latitude
longitude
last_inventory_update
is_active
created_at
updated_at
BloodInventory
Aggregated stock per blood type per hospital.

---

id (PK)
hospital_id (FK)
component_type (RBC, Platelet, Plasma)
abo_type (A, B, AB, O)
rh_type (+, -)
units_available (internal only)
availability_status (Adequate, Low, Critical, None)
last_updated
created_at
updated_at

Index:
(component_type, abo_type, rh_type)
hospital_id
Unique constraint:
hospital_id + component_type + abo_type + rh_type

BloodRequest

---

id (PK)
requesting_hospital_id (FK)
component_type
abo_type
rh_type
units_needed
urgency_level (routine, urgent, emergency)
status (open, fulfilled, closed)
created_by (FK User)
created_at
updated_at

RequestResponse

---

id (PK)
request_id (FK)
responding_hospital_id (FK)
response_status (available, limited, not_available)
message
responded_by (FK User)
timestamp

AuditLog

---

id (PK)
user_id (FK)
action_type
entity_type
entity_id
ip_address
timestamp

🔐 Design Strengths
This schema ensures:
• Controlled inventory updates
• Traceable request flow
• Clear hospital ownership
• Expandability for LIS integration
• Audit compliance readiness
