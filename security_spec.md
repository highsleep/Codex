# Security Specification: Sleepee Mattress Warranty System

## 1. Data Invariants
1. **Serial Number Existence Check**: Before creating `WarrantyActivation`, the system MUST verify that the mattress product `serial_number` exists in `/products/{serial_number}`. If not found, the request is REJECTED.
2. **One Warranty Per Serial (Reject If Already Exists)**: If a warranty activation already exists for that `serial_number`, any subsequent activation request is REJECTED.
3. **Else Create Warranty**: Only when `serial_number` exists AND no prior warranty exists, the system creates the certified warranty record.
4. **Identity & Admin Boundaries**: Customer activations can be submitted publicly with strict payload schema validation, but product catalog edits and administrative operations require verified admin privilege (`sleepyqualitydept@gmail.com` or verified record in `/admins/{uid}`).
5. **Immutability of Key Fields**: `warranty_id`, `serial_number`, `purchase_date`, and `activation_date` must never be altered once created.
6. **No Negative or Oversized Fields**: All string fields are constrained with strict `size() <= max` to prevent Denial of Wallet attacks.
7. **Audit Trail Immutability**: Logs in `/activation_logs` can only be appended (created) and can never be updated or deleted.

## 2. The "Dirty Dozen" Threat Payloads (Must Return PERMISSION_DENIED)
1. **Ghost Field Attack (Products)**: Adding unapproved fields like `{ serial_number: "SLP-999", model: "Royal", isStolen: false, secretBackdoor: true }`.
2. **Unauthenticated Product Injection**: An unauthenticated user attempting `POST` /products with arbitrary serialized mattresses.
3. **ID Poisoning Attack**: Trying to create a product or warranty with a 2KB junk character ID `../../malicious_path`.
4. **Duplicate Warranty Hijack**: Attempting to overwrite an existing `/warranty_activations/SLP-WRN-2601-8192` with another customer's name.
5. **Log Deletion / Tampering**: Attempting to execute `DELETE` or `UPDATE` on `/activation_logs/{logId}`.
6. **Admin Privilege Escalation**: An unauthenticated user writing themselves into `/admins/{their_uid}`.
7. **Spoofed Email Header**: Attempting admin operations with `request.auth.token.email = 'sleepyqualitydept@gmail.com'` while `email_verified = false`.
8. **PII Blanket List Scraping**: Attempting an unrestricted `list` query on customer warranties without authentication.
9. **String Bomb / Resource Exhaustion**: Submitting `customer_name` with 50,000 characters to consume storage.
10. **Negative / Arbitrary Warranty Years**: Submitting a product with negative `warranty_years: -5` or non-integer type.
11. **Premature / Forged Expiry Date Modification**: Submitting an update to `expiry_date` on an activated warranty.
12. **Orphaned Warranty Activation**: Creating an activation referencing a `serial_number` that does not exist in `/products`.
