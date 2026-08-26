import { identityHashDomainReport, serializeIdentityHashDomainReport } from './identity.js';

process.stdout.write(serializeIdentityHashDomainReport(identityHashDomainReport));
if (!identityHashDomainReport.valid) process.exitCode = 1;
