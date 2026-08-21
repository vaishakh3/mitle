# Milte domain decision

Checked 2026-08-21 in India. Availability and checkout prices can change without notice; recheck immediately before purchase.

## Recommendation

Use **`milte.in`** for the India-first launch. It is the shortest affordable exact-name option, sounds natural when spoken, and reinforces the product’s India-born position without weakening the global app name.

Keep the application ID `app.milte`; a web domain can change later without forcing an Android package migration.

## Current options

| Domain | Observed status | Observed price signal | Decision |
| --- | --- | --- | --- |
| `milte.in` | Available at GoDaddy | ₹1 first-year promotion with a three-year term; normal displayed price ₹899. Namecheap lists `.in` at $9.98 registration and $11.98 renewal. | **Primary recommendation** |
| `milte.app` | Registry RDAP returned no registration; GoDaddy lists it for purchase | ₹1,522.86 first year / ₹2,665.71 displayed regular price. Porkbun lists `.app` at $8.75 first year / $14.93 regular. | Best defensive/global exact-name buy |
| `getmilte.com` | Verisign RDAP returned no registration | Registrar checkout required | Best available `.com` fallback |
| `trymilte.com` | Verisign RDAP returned no registration | Registrar checkout required | Clear but more campaign-like |
| `themilte.com` | Available at GoDaddy | ₹1 promotion with a three-year term; displayed regular price ₹1,599 | Acceptable fallback, less natural aloud |
| `mymilte.com` | Available at GoDaddy | ₹1 promotion with a three-year term; displayed regular price ₹1,599 | Avoid; sounds like an account portal |
| `milte.com` | Registered and offered as a premium aftermarket name | ₹95,238.09 minimum offer | Do not spend launch budget here |
| `milte.net` / `milte.ai` | Registered | Broker-service route | Do not pursue |

## Purchase checklist

- Prefer predictable renewal pricing over a headline first-year promotion.
- Enable registrar lock, MFA, auto-renew, and DNSSEC where supported.
- Put the registrant account and recovery email under owner-controlled credentials.
- Use Route 53 DNS and an ACM certificate in `us-east-1` for CloudFront after purchase.
- Redirect secondary domains to the canonical one; do not split SEO or policy URLs.
- Publish `/privacy`, `/terms`, `/support`, and `/delete-account` before entering the domain in Play Console.

No domain was purchased during engineering. Buying one is a financial/ownership handoff, not a blocker for the CloudFront-hosted release candidate.
