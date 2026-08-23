import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const stackName = process.env.MILTE_AWS_STACK ?? 'milte-live';
const region = process.env.MILTE_AWS_REGION ?? 'ap-south-1';

const raw = execFileSync('aws', [
  'cloudformation',
  'describe-stacks',
  '--stack-name', stackName,
  '--region', region,
  '--output', 'json',
], { encoding: 'utf8' });

const stack = JSON.parse(raw).Stacks?.[0];
if (!stack || !['CREATE_COMPLETE', 'UPDATE_COMPLETE'].includes(stack.StackStatus)) {
  throw new Error(`${stackName} is not ready: ${stack?.StackStatus ?? 'not found'}`);
}

const outputs = Object.fromEntries((stack.Outputs ?? []).map((item) => [item.OutputKey, item.OutputValue]));
for (const key of ['ApiUrl', 'UserPoolId', 'UserPoolClientId', 'WebUrl']) {
  if (!outputs[key]) throw new Error(`Missing CloudFormation output: ${key}`);
}

const env = [
  `EXPO_PUBLIC_AWS_REGION=${region}`,
  `EXPO_PUBLIC_API_URL=${outputs.ApiUrl}`,
  `EXPO_PUBLIC_COGNITO_USER_POOL_ID=${outputs.UserPoolId}`,
  `EXPO_PUBLIC_COGNITO_CLIENT_ID=${outputs.UserPoolClientId}`,
  '',
].join('\n');
writeFileSync(`${projectRoot}apps/mobile/.env`, env, { mode: 0o600 });

const appJsonPath = `${projectRoot}apps/mobile/app.json`;
const appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'));
appJson.expo.extra = {
  ...appJson.expo.extra,
  awsRegion: region,
  apiUrl: outputs.ApiUrl,
  cognitoUserPoolId: outputs.UserPoolId,
  cognitoClientId: outputs.UserPoolClientId,
  webUrl: outputs.WebUrl,
};
writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`);

console.log(`Configured Milte from ${stackName}`);
console.log(`Web: ${outputs.WebUrl}`);
console.log(`API: ${outputs.ApiUrl}`);
