# Shop Management System — Specification Changes

Apply these changes to the previously defined management-system blueprint.

## 1. Customer

Customer fields:
- Customer ID — required/generated
- Name — required
- Phone — required
- Email — OPTIONAL
- Address — OPTIONAL
- Notes — OPTIONAL

Do not make email, address, or notes mandatory.

## 2. Service Job Status

Remove the separate "Customer Input" status from the service-job workflow.

Use this status flow instead:

Received
↓
Diagnosis
↓
Waiting for Approval
↓
Approved
↓
Repairing
↓
Quality Check
↓
Ready for Pickup
↓
Completed

Additional statuses:
- Waiting for Parts
- Unrepairable
- Cancelled

The customer should still be associated with the service job through the device/customer relationship, but there should be NO "Customer Input" status.

## 3. Parts

Part fields:
- Part ID
- Part Name — required
- Part Number — required/unique where appropriate
- Compatible Models — OPTIONAL
- Quantity
- Minimum Quantity
- Purchase Price
- Selling Price
- Supplier

Do not require compatible models.

## Implementation Notes

- Update the database schema to reflect these requirements.
- Update validation rules so optional fields are genuinely optional.
- Update frontend forms and backend/API validation accordingly.
- Update service-job status enums/workflows and remove all UI/API/database references to "Customer Input".
- Preserve the existing architecture and do not introduce unnecessary infrastructure.
