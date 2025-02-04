# Security Policy

## Reporting a Vulnerability
If you discover a security vulnerability, please follow the steps below:

1. **Do Not** open a public issue. Instead, contact me directly via [LinkedIn](https://www.linkedin.com/in/abhijeet-dhara/).
2. Provide as much detail as possible, including:
   - A description of the vulnerability.
   - Steps to reproduce the issue.
   - Potential impact.
   - Any relevant logs, screenshots, or code snippets.

We take security vulnerabilities seriously. You will receive an acknowledgment within **48 hours**, and we will work with you to address the issue promptly.

## Responsible Disclosure
We request that you:
- Do not exploit the vulnerability for malicious purposes.
- Do not publicly disclose the vulnerability until it has been resolved.
- Act in good faith to avoid privacy violations, destruction of data, or downtime.

## Security Best Practices
To ensure the security of your integration:
- All updates will be pushed directly to the main branch.
- Use secure API keys and credentials stored in [Google Secrets Manager](https://cloud.google.com/secret-manager/) or Vault access.
- Regularly update dependencies to patch known vulnerabilities.
- Use OAuth2.0 for secure authentication between Google Sheets and NetSuite.
- Limit API permissions to the minimum required for the integration.

## Acknowledgments
We appreciate the efforts of the security community in identifying and responsibly disclosing vulnerabilities.

Thank you for helping us keep NetSuite-GSheet Integration secure!

