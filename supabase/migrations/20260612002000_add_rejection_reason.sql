-- Migration: Add rejection_reason and decided_at to verification_records
-- Required by the verification flow spec (docs/features/verification-flow.md)
-- These columns enable structured rejection reasons and decision timestamps.

alter table verification_records
    add column if not exists rejection_reason text
        check (rejection_reason in (
            'address_mismatch',
            'document_unreadable',
            'name_not_found',
            'document_type_invalid'
        ));

alter table verification_records
    add column if not exists decided_at timestamptz;
