#!/bin/sh
# B1-08 — one-shot MinIO bucket bootstrap for local dev (S3 stand-in).
# Runs in the official minio/mc image once MinIO is healthy, then exits.
# Dev-only credentials come from env; nothing secret is baked in.
set -eu

MINIO_ENDPOINT="http://minio:9000"
ALIAS="local"

echo "waiting for MinIO at ${MINIO_ENDPOINT} ..."
until mc alias set "${ALIAS}" "${MINIO_ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" >/dev/null 2>&1; do
  sleep 1
done

echo "creating bucket ${MINIO_DEFAULT_BUCKET} (idempotent) ..."
mc mb --ignore-existing "${ALIAS}/${MINIO_DEFAULT_BUCKET}"

# Local dev convenience: keep bucket private (no public policy). Encryption and
# bucket policy for real S3 are handled by Terraform (devops, Sprint 7+), never here.
echo "MinIO bucket ready: ${MINIO_DEFAULT_BUCKET} (private)"
