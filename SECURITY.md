# 🔐 BuildrAI Security Documentation

## Security Overview

BuildrAI implements enterprise-grade security measures to protect sensitive data, including GitHub credentials, SSH keys, and Personal Access Tokens (PAT). This document outlines all security implementations and best practices.

---

## 🛡️ Security Features

### 1. **Data Encryption**

#### Encryption Algorithm
- **Algorithm:** AES-256-GCM (Galois/Counter Mode)
- **Key Length:** 256 bits (32 bytes)
- **IV Length:** 128 bits (16 bytes)
- **Authentication Tag:** 128 bits (16 bytes)

#### Why AES-256-GCM?
- ✅ **Authenticated Encryption:** Provides both confidentiality and authenticity
- ✅ **NIST Approved:** Federal standard for encryption
- ✅ **Performance:** Hardware acceleration support
- ✅ **Security:** Resistant to known cryptographic attacks

#### What's Encrypted?
- ✅ GitHub Personal Access Tokens (PAT)
- ✅ SSH Private Keys
- ✅ Any other sensitive credentials

#### What's NOT Encrypted?
- ❌ SSH Public Keys (intentionally - public keys are meant to be shared)
- ❌ Repository URLs (non-sensitive)
- ❌ Branch names (non-sensitive)
- ❌ User IDs (used for auth, not sensitive)

### 2. **Encryption Key Management**

#### Environment Variable
```bash
ENCRYPTION_KEY=your-secure-256-bit-encryption-key-here
```

#### Key Requirements
- **Minimum Length:** 32 characters
- **Recommended:** 64+ characters of random data
- **Generation:** Use `openssl rand -hex 32` to generate secure keys

#### Key Validation
```typescript
// Production: Key is REQUIRED
if (process.env.NODE_ENV === 'production' && !key) {
  throw new Error('ENCRYPTION_KEY environment variable is required in production');
}

// Development: Warning if default key is used
if (!key) {
  console.warn('⚠️ WARNING: Using default encryption key');
}

// Strength Validation: Minimum 32 characters
if (key.length < 32) {
  throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
}
```

### 3. **Secure Logging**

#### Problem with Standard Logging
```typescript
// ❌ INSECURE - Can log sensitive data
console.error('Error:', error); // May contain tokens in error.response.data
```

#### Solution: Secure Logger
```typescript
// ✅ SECURE - Strips sensitive data
import { secureError } from '@/lib/security/logger';
secureError('Error connecting GitHub', error);
```

#### What Gets Redacted?
- GitHub tokens (ghp_, gho_, ghs_, github_pat_)
- SSH private keys (-----BEGIN ... PRIVATE KEY-----)
- API keys (sk-...)
- Any field containing: `token`, `password`, `secret`, `privateKey`, `credential`, etc.

#### Example
```typescript
// Input
const error = {
  token: 'ghp_1234567890abcdefghijklmnopqrstuv',
  message: 'Invalid credentials',
};

// Output (sanitized)
{
  token: '[REDACTED]',
  message: 'Invalid credentials'
}
```

### 4. **Audit Logging**

All sensitive operations are logged for security tracking:

#### Audited Operations
1. **GitHub Connection**
   - `GITHUB_CONNECT` - Successful connection
   - `GITHUB_CONNECT_FAILED` - Failed connection attempt

2. **GitHub Disconnection**
   - `GITHUB_DISCONNECT` - Account disconnected

3. **Repository Import**
   - `GITHUB_IMPORT` - Successful import
   - `GITHUB_IMPORT_FAILED` - Failed import

4. **Code Push**
   - `GITHUB_PUSH` - Successful push
   - `GITHUB_PUSH_FAILED` - Failed push

5. **SSH Key Generation**
   - `SSH_KEY_GENERATED` - New SSH key created

#### Audit Log Format
```json
{
  "timestamp": "2026-05-20T10:30:00.000Z",
  "userId": "user_abc123",
  "action": "GITHUB_CONNECT",
  "resource": "project:proj_xyz789",
  "details": {
    "authMethod": "pat",
    "repoUrl": "https://github.com/user/repo",
    "success": true
  },
  "ip": "[IP Address]"
}
```

### 5. **Input Validation**

#### Encryption Input Validation
```typescript
// Prevents empty/invalid inputs
if (!text || typeof text !== 'string') {
  throw new Error('Cannot encrypt: input must be a non-empty string');
}

// Prevents DoS attacks with large inputs
if (text.length > 100000) {
  throw new Error('Cannot encrypt: input exceeds maximum size (100KB)');
}
```

#### Decryption Input Validation
```typescript
// Validates minimum length
const minLength = (IV_LENGTH + AUTH_TAG_LENGTH) * 2;
if (encryptedData.length < minLength) {
  throw new Error('Decryption failed: Invalid input');
}

// Prevents DoS with large inputs
if (encryptedData.length > 200000) {
  throw new Error('Decryption failed: Input too large');
}
```

#### Generic Error Messages
```typescript
// ✅ SECURE - Doesn't reveal what went wrong
throw new Error('Decryption failed: Invalid input');

// ❌ INSECURE - Reveals too much information
throw new Error('Decryption failed: Wrong encryption key');
throw new Error('Decryption failed: Corrupted IV at position 5');
```

This prevents timing attacks and information leakage.

### 6. **Database Security**

#### Encrypted Fields in Project Model
```typescript
github: {
  connected: Boolean,
  repoUrl: String,              // NOT encrypted (non-sensitive)
  repoName: String,             // NOT encrypted (non-sensitive)
  repoOwner: String,            // NOT encrypted (non-sensitive)
  branch: String,               // NOT encrypted (non-sensitive)
  authMethod: 'ssh' | 'pat' | 'none',
  accessToken: String,          // ✅ ENCRYPTED (GitHub PAT)
  sshPublicKey: String,         // NOT encrypted (public key)
  sshPrivateKey: String,        // ✅ ENCRYPTED (SSH private key)
  lastSyncedAt: Date,
  syncStatus: 'synced' | 'pending' | 'error' | 'never',
  lastCommitSha: String,
  autoSync: Boolean,
}
```

#### Storage Format
All encrypted data is stored as hex-encoded strings:
```
[IV (32 hex chars)][AuthTag (32 hex chars)][Encrypted Data (variable length)]
```

Example:
```
a1b2c3d4e5f6...  (32 chars IV)
7890abcdef12...  (32 chars AuthTag)
3456789abc...    (encrypted data)
```

### 7. **API Response Security**

#### What's NEVER Returned in API Responses
- ❌ Encrypted tokens
- ❌ Decrypted tokens (PAT)
- ❌ SSH private keys (encrypted or decrypted)
- ❌ Encryption keys
- ❌ Internal error details with sensitive data

#### What's Safe to Return
- ✅ SSH public keys (designed to be public)
- ✅ Connection status
- ✅ Repository URLs
- ✅ Branch names
- ✅ Auth method type (but not the credentials)
- ✅ Sync status

#### Example Response
```json
{
  "success": true,
  "data": {
    "github": {
      "connected": true,
      "repoUrl": "https://github.com/user/repo",
      "repoName": "repo",
      "repoOwner": "user",
      "branch": "main",
      "authMethod": "pat",  // ✅ Type is safe
      // ❌ accessToken is NEVER included
      "syncStatus": "synced",
      "lastSyncedAt": "2026-05-20T10:30:00.000Z"
    }
  }
}
```

---

## 🔒 Security Best Practices

### For Development

1. **Set Encryption Key**
   ```bash
   # .env.local
   ENCRYPTION_KEY=$(openssl rand -hex 32)
   ```

2. **Never Commit Credentials**
   - Add `.env.local` to `.gitignore`
   - Never commit tokens or keys
   - Use environment variables

3. **Use HTTPS**
   - Always use HTTPS in production
   - Enable HSTS headers
   - Use secure cookies

### For Production

1. **Mandatory Encryption Key**
   - MUST set `ENCRYPTION_KEY` environment variable
   - Use a strong, randomly generated key (64+ characters)
   - Rotate keys periodically

2. **Secure Key Storage**
   - Use AWS Secrets Manager, Azure Key Vault, or similar
   - Never store keys in code or config files
   - Use separate keys for dev/staging/production

3. **Enable HTTPS**
   - Use SSL/TLS certificates
   - Enable HSTS
   - Disable HTTP

4. **Database Security**
   - Enable encryption at rest
   - Use encrypted connections (TLS)
   - Restrict database access by IP
   - Regular backups with encryption

5. **Monitoring**
   - Monitor audit logs for suspicious activity
   - Set up alerts for failed authentication attempts
   - Track unusual API patterns

6. **Rate Limiting**
   - Implement rate limiting on auth endpoints
   - Prevent brute force attacks
   - Use CAPTCHA for repeated failures

---

## 🚨 Security Incident Response

### If Keys Are Compromised

1. **Immediately Revoke**
   - Revoke GitHub PAT tokens
   - Delete SSH keys from GitHub
   - Generate new credentials

2. **Rotate Encryption Key**
   - Generate new `ENCRYPTION_KEY`
   - Re-encrypt all stored credentials
   - Update production environment

3. **Audit**
   - Review audit logs
   - Check for unauthorized access
   - Notify affected users

4. **Update**
   - Force password resets if needed
   - Update security documentation
   - Improve prevention measures

---

## 📋 Security Checklist

### Before Deployment
- [ ] Set strong `ENCRYPTION_KEY` (64+ characters)
- [ ] Enable HTTPS/TLS
- [ ] Configure database encryption
- [ ] Set up audit logging
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Set secure cookie flags
- [ ] Enable CSP headers
- [ ] Review all environment variables
- [ ] Remove debug/development code

### Regular Maintenance
- [ ] Rotate encryption keys (quarterly)
- [ ] Review audit logs (weekly)
- [ ] Update dependencies (monthly)
- [ ] Security vulnerability scans (weekly)
- [ ] Backup encrypted data (daily)
- [ ] Test disaster recovery (monthly)

---

## 🔍 Security Testing

### How to Verify Encryption

```typescript
// Test encryption/decryption
import { encrypt, decrypt } from '@/lib/github/crypto-utils';

const original = 'ghp_test_token_1234567890';
const encrypted = encrypt(original);
const decrypted = decrypt(encrypted);

console.log('Original:', original);
console.log('Encrypted:', encrypted);
console.log('Decrypted:', decrypted);
console.log('Match:', original === decrypted);
```

### How to Verify Secure Logging

```typescript
import { secureError } from '@/lib/security/logger';

const error = {
  token: 'ghp_1234567890abcdefghijklmnopqrstuv',
  privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMIIE...',
  message: 'Test error',
};

// Should print with sensitive data redacted
secureError('Test error', error);
```

### How to Verify Audit Logging

```typescript
import { auditLog } from '@/lib/security/logger';

// Should log sanitized data
auditLog('user123', 'TEST_ACTION', 'resource:xyz', {
  token: 'ghp_test',
  publicInfo: 'This is OK to log',
});
```

---

## 📚 Additional Resources

### Cryptography
- [NIST AES-GCM Specification](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

### Key Management
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [Azure Key Vault](https://azure.microsoft.com/en-us/services/key-vault/)
- [HashiCorp Vault](https://www.vaultproject.io/)

### Security Testing
- [OWASP ZAP](https://www.zaproxy.org/)
- [Burp Suite](https://portswigger.net/burp)

---

## 📞 Security Contact

For security vulnerabilities or concerns:
- **Email:** security@buildrai.com
- **Bug Bounty:** [Coming Soon]

**DO NOT** disclose security issues publicly. Report privately first.

---

## ✅ Summary

BuildrAI implements:
- ✅ AES-256-GCM encryption for all sensitive data
- ✅ Secure key management with validation
- ✅ Comprehensive audit logging
- ✅ Input validation and DoS protection
- ✅ Secure error handling without information leakage
- ✅ Safe API responses (no sensitive data exposure)
- ✅ Database security with encrypted fields
- ✅ Production-ready security measures

**All sensitive data is encrypted before storage and never exposed in logs or API responses.**

---

*Last Updated:* May 20, 2026
*Security Audit Status:* ✅ Complete
