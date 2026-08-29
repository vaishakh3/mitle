import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultUser, type MatchItem } from '../src/domain.js';

const mocks = vi.hoisted(() => ({
  dbSend: vi.fn(),
  cognitoSend: vi.fn(),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class DynamoDBClient {} }));

vi.mock('@aws-sdk/lib-dynamodb', () => {
  class Command {
    constructor(public input: Record<string, unknown>) {}
  }
  return {
    DynamoDBDocumentClient: { from: () => ({ send: mocks.dbSend }) },
    BatchGetCommand: class BatchGetCommand extends Command {},
    DeleteCommand: class DeleteCommand extends Command {},
    GetCommand: class GetCommand extends Command {},
    PutCommand: class PutCommand extends Command {},
    QueryCommand: class QueryCommand extends Command {},
    TransactWriteCommand: class TransactWriteCommand extends Command {},
    UpdateCommand: class UpdateCommand extends Command {},
  };
});

vi.mock('@aws-sdk/client-cognito-identity-provider', () => {
  class AdminDeleteUserCommand {
    constructor(public input: Record<string, unknown>) {}
  }
  return {
    AdminDeleteUserCommand,
    CognitoIdentityProviderClient: class CognitoIdentityProviderClient {
      send = mocks.cognitoSend;
    },
  };
});

process.env.TABLE_NAME = 'test-table';
process.env.USER_POOL_ID = 'test-pool';
process.env.MILTE_TZ = 'Asia/Kolkata';

const { handler } = await import('../src/handler.js');

const USER_ID = '4ac84fe6-11c3-4e08-95ef-0f5d3e84c189';
const MATCH_ID = 'af6b4c4b-b968-405d-ae7a-56004be196ab';

function storedUser(id = USER_ID) {
  return { ...defaultUser(id), username: 'quiet-lantern-4821' };
}

function apiEvent(path: string, method: string, body?: Record<string, unknown>, authenticated = true) {
  return {
    rawPath: path,
    requestContext: {
      http: { method, sourceIp: '203.0.113.8' },
      authorizer: authenticated ? { jwt: { claims: { sub: USER_ID } } } : undefined,
    },
    body: body ? JSON.stringify(body) : null,
  };
}

function responseBody(result: unknown) {
  return JSON.parse((result as { body: string }).body);
}

function match(startOffsetHours = 23): MatchItem {
  const start = new Date(Date.now() + startOffsetHours * 3600_000);
  return {
    PK: `MATCH#${MATCH_ID}`,
    SK: 'META',
    entityType: 'MATCH',
    id: MATCH_ID,
    user_a: USER_ID,
    user_b: 'b2927df7-0928-49f1-9d4d-19c290d71f72',
    status: 'committed',
    accept_deadline: new Date(Date.now() - 3600_000).toISOString(),
    created_at: new Date().toISOString(),
    window_start: start.toISOString(),
    window_end: new Date(start.getTime() + 3600_000).toISOString(),
    GSI1PK: 'MATCH#committed',
    GSI1SK: start.toISOString(),
    expiresAt: Math.floor(Date.now() / 1000) + 86400,
  };
}

beforeEach(() => {
  mocks.dbSend.mockReset();
  mocks.cognitoSend.mockReset();
});

describe('AWS API routes', () => {
  it('keeps browser preflight public and side-effect free', async () => {
    const result = await handler(apiEvent('/support', 'OPTIONS', undefined, false));
    expect(result).toMatchObject({ statusCode: 204 });
    expect(mocks.dbSend).not.toHaveBeenCalled();
  });

  it('keeps health public without exposing configuration', async () => {
    const result = await handler(apiEvent('/health', 'GET', undefined, false));
    expect(result).toMatchObject({ statusCode: 200 });
    expect(responseBody(result)).toMatchObject({ ok: true, service: 'milte' });
    expect(mocks.dbSend).not.toHaveBeenCalled();
  });

  it('atomically assigns one unique anonymous username to a new account', async () => {
    mocks.dbSend.mockResolvedValueOnce({}).mockResolvedValueOnce({});
    const result = await handler(apiEvent('/me/profile', 'GET'));
    expect(result).toMatchObject({ statusCode: 200 });
    const profile = responseBody(result);
    expect(profile.username).toMatch(/^[a-z]+-[a-z]+-\d{4}$/);

    const transaction = mocks.dbSend.mock.calls[1][0];
    expect(transaction.constructor.name).toBe('TransactWriteCommand');
    expect(transaction.input.TransactItems[0].Put.Item).toMatchObject({ userId: USER_ID, username: profile.username });
    expect(transaction.input.TransactItems[1].Put.Item).toMatchObject({
      PK: `USERNAME#${profile.username}`,
      SK: 'OWNER',
      userId: USER_ID,
    });
  });

  it('backfills a username for an existing account without changing its profile', async () => {
    const legacy = defaultUser(USER_ID);
    mocks.dbSend.mockResolvedValueOnce({ Item: legacy }).mockResolvedValueOnce({});
    const result = await handler(apiEvent('/me/profile', 'GET'));
    expect(result).toMatchObject({ statusCode: 200 });
    const transaction = mocks.dbSend.mock.calls[1][0];
    expect(transaction.constructor.name).toBe('TransactWriteCommand');
    expect(transaction.input.TransactItems[1].Update).toMatchObject({
      Key: { PK: `USER#${USER_ID}`, SK: 'PROFILE' },
      UpdateExpression: 'SET username = :username',
    });
  });

  it('rejects unsupported and malformed profile fields', async () => {
    mocks.dbSend.mockResolvedValue({ Item: storedUser() });
    const unsupported = await handler(apiEvent('/me/profile', 'PUT', { admin: true }));
    expect(unsupported).toMatchObject({ statusCode: 400 });
    expect(responseBody(unsupported).error).toContain('invalid field');

    const username = await handler(apiEvent('/me/profile', 'PUT', { username: 'real-name' }));
    expect(username).toMatchObject({ statusCode: 400 });
    expect(responseBody(username).error).toContain('invalid field');

    const malformed = await handler(apiEvent('/me/profile', 'PUT', { display_name: 42 }));
    expect(malformed).toMatchObject({ statusCode: 400 });
    expect(responseBody(malformed).error).toBe('invalid display name');

    const badAvatar = await handler(apiEvent('/me/profile', 'PUT', { avatar_id: 'selfie' }));
    expect(badAvatar).toMatchObject({ statusCode: 400 });
    expect(responseBody(badAvatar).error).toBe('invalid avatar');
  });

  it('uses an optimistic revision when saving profile changes', async () => {
    mocks.dbSend.mockResolvedValueOnce({ Item: storedUser() }).mockResolvedValueOnce({});
    const result = await handler(apiEvent('/me/profile', 'PUT', { display_name: 'Mira', avatar_id: '04' }));
    expect(result).toMatchObject({ statusCode: 200 });
    const put = mocks.dbSend.mock.calls[1][0];
    expect(put.constructor.name).toBe('PutCommand');
    expect(put.input).toMatchObject({
      ConditionExpression: 'attribute_not_exists(revision) OR revision = :expectedRevision',
      ExpressionAttributeValues: { ':expectedRevision': 0 },
    });
    expect(put.input.Item).toMatchObject({ display_name: 'Mira', avatar_id: '04', revision: 1 });
  });

  it('accepts public support without requiring an account and returns a reference', async () => {
    mocks.dbSend.mockResolvedValue({});
    const result = await handler(apiEvent('/support', 'POST', {
      email: 'person@example.com',
      category: 'account',
      message: 'I need help recovering access to my account.',
    }, false));
    expect(result).toMatchObject({ statusCode: 201 });
    expect(responseBody(result).reference).toMatch(/^MI-[A-F0-9]{8}$/);
    expect(mocks.dbSend).toHaveBeenCalledTimes(2);
    expect(mocks.dbSend.mock.calls[1][0].input.Item).toMatchObject({ entityType: 'SUPPORT', status: 'open' });
  });

  it('rate-limits public support before storing a ticket', async () => {
    mocks.dbSend.mockRejectedValueOnce(Object.assign(new Error('limited'), { name: 'ConditionalCheckFailedException' }));
    const result = await handler(apiEvent('/support', 'POST', {
      email: 'person@example.com',
      category: 'privacy',
      message: 'Please help me with a privacy request.',
    }, false));
    expect(result).toMatchObject({ statusCode: 429 });
    expect(mocks.dbSend).toHaveBeenCalledTimes(1);
  });

  it('opens confirmation 24 hours before the meet and writes only one member field', async () => {
    mocks.dbSend.mockResolvedValueOnce({ Item: match(23) }).mockResolvedValueOnce({});
    const result = await handler(apiEvent('/match/confirm', 'POST', { matchId: MATCH_ID }));
    expect(result).toMatchObject({ statusCode: 204 });
    const update = mocks.dbSend.mock.calls[1][0];
    expect(update.constructor.name).toBe('UpdateCommand');
    expect(update.input).toMatchObject({ UpdateExpression: 'SET #confirmation = if_not_exists(#confirmation, :now)' });
  });

  it('keeps the recognition/confirmation boundary closed before 24 hours', async () => {
    mocks.dbSend.mockResolvedValueOnce({ Item: match(25) });
    const result = await handler(apiEvent('/match/confirm', 'POST', { matchId: MATCH_ID }));
    expect(result).toMatchObject({ statusCode: 409 });
    expect(responseBody(result).error).toContain('24 hours');
    expect(mocks.dbSend).toHaveBeenCalledTimes(1);
  });

  it('uses atomic day-of status updates so members cannot overwrite each other', async () => {
    mocks.dbSend
      .mockResolvedValueOnce({ Item: match() })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: null });
    const result = await handler(apiEvent('/match/signal', 'POST', { matchId: MATCH_ID, signal: 'arrived' }));
    expect(result).toMatchObject({ statusCode: 204 });
    const update = mocks.dbSend.mock.calls[1][0];
    expect(update.constructor.name).toBe('UpdateCommand');
    expect(update.input).toMatchObject({ UpdateExpression: 'SET #signal = :signal' });
  });

  it('turns can’t-make-it into an irreversible cancellation', async () => {
    mocks.dbSend
      .mockResolvedValueOnce({ Item: match() })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: null });
    const result = await handler(apiEvent('/match/signal', 'POST', { matchId: MATCH_ID, signal: 'cant_make_it' }));
    expect(result).toMatchObject({ statusCode: 204 });
    const update = mocks.dbSend.mock.calls[1][0];
    expect(update.constructor.name).toBe('UpdateCommand');
    expect(update.input.UpdateExpression).toContain('cancelled_at = if_not_exists');
    expect(update.input.ConditionExpression).toContain('attribute_not_exists(cancelled_at)');
    expect(update.input.ExpressionAttributeValues).toMatchObject({ ':userId': USER_ID });
  });

  it('will not confirm a cancelled plan', async () => {
    mocks.dbSend
      .mockResolvedValueOnce({ Item: { ...match(), cancelled_at: new Date().toISOString(), cancelled_by: USER_ID } })
      .mockRejectedValueOnce(Object.assign(new Error('cancelled'), { name: 'ConditionalCheckFailedException' }));
    const result = await handler(apiEvent('/match/confirm', 'POST', { matchId: MATCH_ID }));
    expect(result).toMatchObject({ statusCode: 409 });
    const update = mocks.dbSend.mock.calls[1][0];
    expect(update.input.ConditionExpression).toContain('attribute_not_exists(cancelled_at)');
  });

  it('deletes user-owned records and the Cognito identity', async () => {
    const profile = storedUser();
    mocks.dbSend
      .mockResolvedValueOnce({ Item: profile })
      .mockResolvedValueOnce({ Item: null })
      .mockResolvedValueOnce({ Items: [profile] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    mocks.cognitoSend.mockResolvedValueOnce({});
    const result = await handler(apiEvent('/me', 'DELETE'));
    expect(result).toMatchObject({ statusCode: 204 });
    expect(mocks.cognitoSend).toHaveBeenCalledOnce();
    expect(mocks.cognitoSend.mock.calls[0][0].input).toMatchObject({ UserPoolId: 'test-pool', Username: USER_ID });
    const deletes = mocks.dbSend.mock.calls.filter(([command]) => command.constructor.name === 'DeleteCommand');
    expect(deletes.map(([command]) => command.input.Key)).toContainEqual({ PK: `USERNAME#${profile.username}`, SK: 'OWNER' });
  });
});
