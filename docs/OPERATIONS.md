# Milte production operations

Production is the `milte-live` CloudFormation stack in `ap-south-1`. Infrastructure changes come from `infra/aws/template.yaml`; console-only drift is not a deployment strategy.

## Release

1. Use Node 22 (`nvm use`), Java 17, and the committed lockfiles.
2. Run the complete verification matrix in `docs/RELEASE_READINESS.md`.
3. Build and deploy the SAM change set:

   ```sh
   cd infra/aws
   sam validate --lint
   PATH="$PWD/app/node_modules/.bin:$PATH" sam build
   sam deploy --region ap-south-1 --stack-name milte-live \
     --resolve-s3 --capabilities CAPABILITY_IAM \
     --parameter-overrides \
       Environment=live \
       LaunchTimezone=Asia/Kolkata \
       AlertEmail="$MILTE_ALERT_EMAIL" \
       AuthEmailIdentityArn="$MILTE_AUTH_EMAIL_IDENTITY_ARN" \
       AuthEmailFrom="$MILTE_AUTH_EMAIL_FROM"
   ```

4. Read CloudFormation outputs. Export web with the live public IDs, sync `apps/mobile/dist/` to `WebBucketName` using `aws s3 sync --delete`, and invalidate `/*` on `WebDistributionId`.
5. Call `/health`, submit a support canary, complete one controlled Cognito OTP journey, and inspect the alarms/schedules before declaring success.

## Rollback

- Application code/config regression: redeploy the last known-good Git commit through SAM. Do not manually edit the Lambda.
- Static web regression: restore the previous S3 object versions, then invalidate CloudFront.
- Android regression before Play rollout: stop the rollout. Upload a higher `versionCode`; Play does not permit reusing a version code.
- Schema/data regression: stop scheduled matching first. DynamoDB point-in-time recovery is enabled; restore into a new table, validate counts and representative records, then deliberately migrate or change the stack reference. Never overwrite the retained production table during diagnosis.

## Scheduled work

- Daily matching: 08:00 in `LaunchTimezone` (currently Asia/Kolkata).
- Housekeeping: every 15 minutes.
- Both jobs have bounded retries and dead-letter delivery. Lambda errors, throttles, duration, scheduler drops, API 5xx, and DynamoDB system errors have CloudWatch alarms.
- A retry must not create two active matches, duplicate feedback, duplicate reminders, or overwrite another member’s day-of state. Transaction conditions and atomic updates enforce this.

## Incident response

1. Protect people first: suspend affected accounts by direct Lambda invoke and end any active match.
2. Record start time, reporter/reference, affected resources, actions, and operator in the private incident log; never paste report text, tokens, or coordinates into chat or tickets.
3. Check CloudWatch metrics before logs. Query logs by request ID and time window; do not add sensitive body logging.
4. Contain: pause Scheduler rules for matching if integrity is uncertain, restrict the API if abuse is active, and preserve relevant safety records.
5. Recover with a reviewed SAM deployment or documented data restoration.
6. Verify health, auth, matching invariants, deletion, alarms, and schedule state. Write a blameless follow-up with a named owner and deadline.

## Backups and restore rehearsal

- DynamoDB PITR and TTL are enabled; the table has Retain policies.
- S3 web versioning is enabled; the origin is private and accessible only through CloudFront OAC.
- Quarterly: restore the table to a temporary name, compare item/entity counts, inspect redacted representative records, test the recovery application against it, then delete the temporary table after evidence is recorded.
- Never use production report content as test fixtures.

## Cost controls

- DynamoDB is on-demand; Lambda is ARM64; CloudFront uses PriceClass 100; the eligible draw is capped at 100. The launch account's total Lambda concurrency quota is 10, so AWS does not permit a function reservation without first raising the account quota.
- The optional USD 10 monthly budget is created when `AlertEmail` is supplied, with forecasted 50% and actual 90% notifications.
- Weekly during pilot: review Lambda duration/invocations, DynamoDB requests/storage, CloudFront transfer, Amazon Location requests, Cognito MAUs, log ingestion, and AWS Budget status.

## Email and notifications

- Cognito default email delivery is capped at 50 messages per AWS account each day and is not acceptable for a multi-person pilot. Production deployments must use a verified SES identity in Mumbai, report `AuthEmailMode=SES`, configure bounce/complaint handling, and run deliverability canaries.
- Push is optional to account integrity but important to arrival. Create the EAS project, add its public `projectId`, configure Android push credentials, and test match, commitment, reminder, signal, and feedback notifications on a physical device. Invalid Expo tokens are removed automatically after `DeviceNotRegistered` responses.

## Sensitive-data rules

- Never log Authorization headers, Cognito tokens/codes, location points, spot hints, second-chapter notes, support bodies, or safety-report text.
- CloudWatch access logs are limited to request ID, route, status, response length, and integration error class.
- Upload keys, Play service accounts, Firebase files, and environment files stay outside Git.
