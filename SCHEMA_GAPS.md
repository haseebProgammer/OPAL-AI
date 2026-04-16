# SCHEMA GAPS - OPAL-AI Production Matching Core

The following columns/tables are required for the AI Matching Pipeline but are currently missing or named differently in the Supabase database.

## 1. Table: `donors`
Current implementation uses separate `blood_donors` and `organ_donors` tables. The pipeline requires a unified view or table.

### Missing Columns (Required for Matching Logic):
- `gender` (varchar/text) - Used for model scoring and identification.
- `condition_hypertension` (boolean) - Disqualifier/Ranking factor.
- `condition_heart_disease` (boolean) - Disqualifier/Ranking factor.

### Data Type/Naming Discrepancies:
- Actual: `full_name` -> Expected: `name`
- Actual: `diabetes` (in organ_donors) -> Expected: `condition_diabetes`

## 2. Table: `hospitals`
### Naming Discrepancies:
- Actual: `hospital_name` -> Expected: `name`

## 3. Table: `organ_requests`
**CRITICAL:** This table does not exist. It is required to track hospital needs.

---

## SQL MIGRATIONS

```sql
-- Create organ_requests table
CREATE TABLE organ_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id),
    patient_blood_type VARCHAR(5) NOT NULL,
    required_organs JSONB NOT NULL, -- e.g. ["Kidney", "Liver"]
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: In a production scenario, we would also:
-- 1. Add missing condition columns to a unified donors table.
-- 2. Add gender to donors table.
```
