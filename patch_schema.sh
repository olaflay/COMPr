#!/bin/bash
sed -i 's/@@index(\[ipHash, createdAt\])/\/\/ Fixes full table scan in lib\/job-intake.ts fallback rate limiter\n  @@index(\[ipHash, createdAt\])/' prisma/schema.prisma
