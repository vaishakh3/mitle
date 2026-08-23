# Milte on AWS

This is Milte’s production runtime. It is serverless, lives in `ap-south-1`, has no café or venue-partner dependency, and is designed to keep idle beta costs close to zero.

## Resources

- Cognito Essentials user pool with passwordless email OTP
- API Gateway HTTP API with Cognito JWT authorization and route throttling
- one ARM64 Lambda for the member API, daily matching, expiry, and reminders
- encrypted DynamoDB single table with TTL, point-in-time recovery, and retained safety records
- Amazon Location Service search for named, current public places
- EventBridge Scheduler jobs with retries, dead-letter queues, and failure alarms
- private, encrypted, versioned S3 web origin behind CloudFront OAC and security headers
- CloudWatch alarms for Lambda, API, scheduler, and DynamoDB failures
- optional SNS operations topic and USD 10 monthly AWS Budget when `AlertEmail` is supplied

## Deploy

```sh
cd infra/aws
npm --prefix app ci
npm --prefix app run build
npm --prefix app test
sam validate --lint
export PATH="$PWD/app/node_modules/.bin:$PATH"
sam build
sam deploy --region ap-south-1 --stack-name milte-live \
  --resolve-s3 --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    Environment=live \
    LaunchTimezone=Asia/Kolkata \
    AlertEmail='' \
    AuthEmailIdentityArn='arn:aws:ses:ap-south-1:ACCOUNT_ID:identity/support@example.com' \
    AuthEmailFrom='Milte <support@example.com>'
```

Creating the stack creates IAM roles. Review the generated change set before production deployment.

```sh
aws cloudformation describe-stacks --region ap-south-1 --stack-name milte-live \
  --query 'Stacks[0].Outputs' --output table
```

Write the API, region, user-pool ID, and client ID to `apps/mobile/.env`, export the web app, sync it to the output bucket, and invalidate CloudFront.

## Operational contract

- `MilteTable` is retained if the stack is deleted or replaced.
- User-facing live match records expire automatically. Pair history and feedback retain for 400 days, safety pair history and confidential reports for three years, and support tickets for 180 days.
- API access logs contain route, status, size, request ID, and integration-error metadata only. Tokens, bodies, coordinates, reports, and support messages are excluded.
- Daily matching runs in `Asia/Kolkata`; housekeeping runs every 15 minutes. Both are idempotent under retry.
- The initial draw scans at most 100 eligible members. Raise this only with a matching-worker redesign.
- Venue search uses current Amazon Location data and fails closed if it cannot return a named place. Ordinary meetings require no venue partnership or approval.
- A live stack must report the `AuthEmailMode` output as `SES`. Cognito's default sender is capped at 50 messages per AWS account each day and must not be used for a multi-person pilot.
- The account’s low Lambda concurrency quota already limits surprise compute spend. Add the owner’s confirmed alert email before inviting testers.
