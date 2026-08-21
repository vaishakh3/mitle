# Trust, safety, and support runbook

Milte creates real-world introductions. Automated controls reduce exposure; a named adult operator remains required for the controlled pilot and public launch.

## Response targets

- Immediate danger or credible near-term threat: show emergency guidance immediately; operator reviews as soon as alerted and within 1 hour during published coverage.
- Harassment, stalking, sexual coercion, identity concern, or repeat evasion: first review within 4 hours during coverage.
- No-show, conduct, account, privacy, and technical support: first response within 2 business days.
- The app must never claim continuous monitoring until staffing actually provides it.

## Report handling

1. Confirm the reference, timestamps, reporter ID, reported ID, pair/history ID, and category. Limit access to authorised operators.
2. Do not contact the reported person with the reporter’s words or identity.
3. Check account state, prior reports, pair history, and active-match state. Do not infer guilt from a single automated signal.
4. Choose and record one resolution: no action, guidance, warning, temporary suspension, permanent suspension, or legal/emergency escalation.
5. When risk warrants, suspend by invoking the Lambda directly with IAM-authenticated operator credentials:

   ```sh
   aws lambda invoke --region ap-south-1 \
     --function-name milte-live-api \
     --cli-binary-format raw-in-base64-out \
     --payload '{"job":"suspend-user","userId":"USER_UUID"}' response.json
   ```

   Suspension removes the person from the pool and archives any active match. Reinstatement uses `job: reinstate-user` after documented review.
6. Preserve relevant report records under a legal/safety hold when required; otherwise the three-year TTL applies.
7. Send only necessary outcome information. Do not promise a specific disciplinary action or reveal another person’s data.

## Support queue

- Public support requests are stored as `SUPPORT#MI-...` records for 180 days and rate-limited to three per source per day.
- Operators can locate a known reference with DynamoDB `GetItem`; queue listing uses a tightly scoped, paginated scan until an operator index/dashboard is justified by volume.
- Reply outside AWS only from the approved support mailbox. Verify account ownership before disclosing or changing personal data.

## Escalation

- Immediate danger: direct the person to 112, local emergency services, venue staff, and a trusted person. Milte cannot dispatch help.
- Credible threat, stalking, coercion, exploitation, or serious violence: suspend, preserve evidence, notify the safety lead, and follow counsel-approved law-enforcement handling.
- Law-enforcement requests: verify authority and scope, preserve the request, involve counsel, disclose only what is legally required, and log every disclosure.
- Self-harm or medical content: do not present Milte as a crisis service; provide local emergency options and escalate under the approved policy.

## Abuse cases to rehearse

- OTP floods and account enumeration;
- multiple accounts and suspension evasion;
- spoofed or stale location;
- malicious spot hints or post-meet notes;
- report retaliation and coordinated false reports;
- attempts to extract identity through support;
- compromised operator/AWS credentials;
- repeat no-shows and last-minute cancellations.

## Venue policy

Milte selects a named, populated public place from current map data near the pair’s midpoint. Venues do not need to approve ordinary customer meetings and no partnership dependency exists. The product never presents an unverified coordinate as a destination; place-search failure stops commitment and asks the members to retry. Members are told to check the surroundings, operating hours, independent travel, and exits before leaving.
