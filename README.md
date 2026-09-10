# SPECTRA-X

### Adaptive Learning-Based Scan Scheduler for Electronic Support

> **Smart Scan Strategy for Electronic Warfare**  
> Smart India Hackathon 2026 — Problem Statement **SIH26055**  
> Organization: **Defence Research and Development Organisation (DRDO)**

---

## 🛰️ Overview

**SPECTRA-X** is an adaptive scan-scheduling system designed to intelligently determine **where to scan and how long to observe** in a wide-spectrum electronic support environment.

Instead of relying on a fixed open-loop scanning strategy, SPECTRA-X continuously learns from receiver-side observations and adapts its next scanning action.

The system follows a closed-loop decision process:

**Observe → Learn → Decide → Observe**

At every step, the scheduler selects an action consisting of:

- **Frequency region**
- **Dwell duration**

The scheduler balances exploration of uncertain regions with exploitation of promising regions.

---

## 🎯 Problem

Traditional fixed or open-loop scanning strategies may spend valuable observation time scanning regions that provide little useful information.

SPECTRA-X explores an adaptive alternative where the scheduler uses previous receiver observations to update its understanding of spectrum activity and select the next scan action.

The system is evaluated through controlled software simulation and randomized unseen environments.

---

## 💡 Proposed Solution

SPECTRA-X implements a **closed-loop adaptive scheduling architecture** consisting of:

```text
┌─────────────────────────┐
│  Simulated RF           │
│  Environment            │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Receiver Model         │
│  Detection / False      │
│  Alarms                 │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Observation            │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Belief / State         │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Contextual Bandit      │
│  Scheduler              │
└────────────┬────────────┘
             │
             ▼
     Action Selection
  Frequency + Dwell Time
             │
             └──────────────► Observe again
