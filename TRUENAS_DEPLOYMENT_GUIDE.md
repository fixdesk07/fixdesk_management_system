# 🚀 FixDesk — TrueNAS Server Deployment Guide

This guide walks you through deploying the complete **FixDesk** shop management system (PostgreSQL Database, Node.js Backend API, and React/NGINX Frontend) onto your **TrueNAS** server.

---

## 📋 Overview of the Setup

FixDesk is containerized using Docker and Docker Compose with 3 production services:
1. **`fixdesk-postgres`**: PostgreSQL 16 database storing customers, jobs, parts, invoices, device models, and staff.
2. **`fixdesk-backend`**: Node.js Express API server with automatic schema migrations.
3. **`fixdesk-frontend`**: High-performance NGINX web server serving the React UI and reverse-proxying API traffic.

---

## 🛠️ Step 1: Transfer FixDesk Project to TrueNAS

You can copy the `FixDesk` folder to your TrueNAS storage pool (e.g. `/mnt/tank/apps/fixdesk`):

### Option A: Using SMB / Network Share
1. Create a dataset on TrueNAS (e.g., `tank/apps/fixdesk`).
2. Share it over **SMB**.
3. Copy the `FixDesk` project folder from your Windows PC into the share.

### Option B: Using SCP / SSH / Git
From your TrueNAS shell or SSH terminal:
```bash
mkdir -p /mnt/tank/apps/fixdesk
cd /mnt/tank/apps/fixdesk
# Copy files or clone your repo here
```

---

## ⚙️ Step 2: Configure Environment Variables

1. Inside `/mnt/tank/apps/fixdesk`, create your `.env` file from the template:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with `nano .env`:
   ```env
   # Web Interface Port (Access via http://<TRUENAS-IP>:3000)
   FRONTEND_PORT=3000

   # Database Credentials
   DB_NAME=fixdesk
   DB_USER=admin
   DB_PASS=YourSecurePassword123!

   # JWT Auth Secret
   JWT_SECRET=production_secret_key_change_me_for_security
   ```
   *Save with `Ctrl+O`, then exit with `Ctrl+X`.*

---

## 🚀 Step 3: Launch with Docker Compose

Depending on your TrueNAS SCALE version:

### A. TrueNAS SCALE 24.10+ (Electric Eel) or Portainer / Dockge
Run the build and startup command directly in the project directory:
```bash
cd /mnt/tank/apps/fixdesk
docker compose up -d --build
```

### Check Running Containers & Logs:
```bash
# Check status of all 3 containers
docker compose ps

# View backend startup logs & database migration status
docker compose logs -f backend
```

You should see:
```text
[MIGRATE] All migrations applied successfully.
✓ FixDesk backend listening on http://localhost:4000
```

---

## 🌐 Step 4: Access FixDesk (Local & Remote via Tailscale)

### A. Local Network Access
Open any browser on your local network:
```text
http://<LOCAL-TRUENAS-IP>:3000
```
*(e.g. `http://192.168.1.100:3000`)*

---

### B. Remote Access via Tailscale (Recommended & Zero Port-Forwarding!)
Because Tailscale runs directly on your TrueNAS host or tailnet, FixDesk is automatically accessible from anywhere in the world:

1. **Access via TrueNAS Tailscale IP**:
   ```text
   http://100.x.y.z:3000
   ```
   *(e.g. `http://100.120.84.8:3000`)*

2. **Access via Tailscale MagicDNS Hostname**:
   ```text
   http://truenas:3000
   ```
   *(or `http://your-nas-name.your-tailnet.ts.net:3000`)*

3. **Optional: Free Automatic HTTPS via Tailscale Serve**:
   If you want automatic SSL without opening any ports, run in your TrueNAS shell:
   ```bash
   tailscale serve https / http://127.0.0.1:3000
   ```
   Now you can access FixDesk securely at:
   ```text
   https://your-truenas-name.your-tailnet.ts.net
   ```

---

## 👥 Default Login Credentials

| Role | Username / Email | Default Password | Access Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Full Access: Dashboard, Jobs, Invoices, Stock, Staff, Device Catalog |
| **Receptionist** | `reception` | `reception123` | Front Desk: Job Intake, Customers, Billing & Invoicing, Device Catalog |
| **Technician** | `tech1` | `tech123` | Workbench: Repair Diagnoses, Status Updates, Parts Allocation |

> **Security Recommendation**: Once logged in as Admin, change the default passwords in the **Staff & Team** page.

---

## 🔄 Updating FixDesk in the Future

Whenever new features or code updates are added:
```bash
cd /mnt/tank/apps/fixdesk
# Pull latest code or paste updated files
docker compose down
docker compose up -d --build
```
*Your database and all repair records remain completely safe in the persistent TrueNAS dataset volume.*

---

## 🛡️ Backup & TrueNAS Snapshots

To back up your FixDesk database:
1. Go to TrueNAS Web UI &rarr; **Data Protection** &rarr; **Periodic Snapshot Tasks**.
2. Add a snapshot schedule for your `tank/apps/fixdesk` dataset.
3. TrueNAS ZFS will take instant, zero-cost point-in-time backups of all your shop records.
