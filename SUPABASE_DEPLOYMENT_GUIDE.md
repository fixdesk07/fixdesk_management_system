# ⚡ FixDesk — Supabase & Cloud Hosting Guide

This guide walks you through deploying **FixDesk** to **Supabase** (Database, Auth, and Realtime API) and **Vercel** (Frontend Web App). 

Once deployed, you can access FixDesk securely from **any smartphone, tablet, or PC anywhere in the world** without needing a local server, router port-forwarding, or Tailscale!

---

## 🚀 Step 1: Create your Supabase Database

1. Go to [Supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **New Project**:
   - **Name**: `FixDesk`
   - **Database Password**: Set a strong password (save it safely).
   - **Region**: Choose the region closest to your shop.
3. Once your project finishes spinning up (~1-2 minutes), go to the **SQL Editor** tab on the left sidebar.
4. Click **New Query**, then copy and paste the entire contents of [`supabase/schema.sql`](./supabase/schema.sql).
5. Click **RUN** (▶).
   - *This will automatically create all tables, indexes, constraints, default seed accounts, device models, and atomic stored procedures.*

---

## 🔑 Step 2: Get your Supabase API Credentials

1. In your Supabase Dashboard, go to **Project Settings** (gear icon) &rarr; **API**.
2. Find your credentials:
   - **Project URL** (e.g. `https://xyzcompany.supabase.co`)
   - **anon / public key** (starts with `eyJ...`)

---

## 🌐 Step 3: Deploy Frontend to Vercel (Free)

### Option A: Using Vercel Web Dashboard (Easiest)
1. Push your `FixDesk` repository to GitHub, GitLab, or Bitbucket.
2. Go to [Vercel.com](https://vercel.com) and log in.
3. Click **Add New** &rarr; **Project**, and import your repository.
4. Set **Root Directory** to `frontend`.
5. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = `https://your-project-id.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-anon-public-key`
6. Click **Deploy**.

### Option B: Using Vercel CLI from Terminal
```bash
npm i -g vercel
cd frontend
vercel
```
Follow the prompts and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` when asked.

---

## 👥 Default Login Credentials

Once deployed, open your Vercel URL (e.g., `https://fixdesk.vercel.app`) in any browser:

| Role | Username | Default Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Full Access: Dashboard, Jobs, Invoices, Stock, Staff, Device Catalog |
| **Receptionist** | `priya` / `elena` | `reception123` | Front Desk: Job Intake, Customers, Billing & Invoicing |
| **Technician** | `alex` / `david` / `sam` | `tech123` | Workbench: Repair Diagnoses, Status Updates, Parts Allocation |

---

## 🎉 Benefits of this Setup
- ❌ **No Tailscale required on any client device.**
- ❌ **No local TrueNAS server or PC running 24/7.**
- ✅ **Instant Realtime Sync:** Repair job status changes update live across all connected shop devices.
- ✅ **100% Free Tier:** Runs effortlessly within Supabase & Vercel free limits.
