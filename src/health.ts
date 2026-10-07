export interface HealthBody {
  status: 'ok';
  ok: true;
  service: 'ewurk';
  commit: string;
  env: 'dev' | 'uat' | 'production';
  utc: string;
}

export function deployEnv(env: NodeJS.ProcessEnv = process.env): HealthBody['env'] {
  const name = (env.APP_ENV ?? env.RAILWAY_ENVIRONMENT_NAME ?? '').trim().toLowerCase();
  if (name === 'production' || name === 'prod') return 'production';
  if (name === 'uat') return 'uat';
  return 'dev';
}

export function healthBody(env: NodeJS.ProcessEnv = process.env, now: Date = new Date()): HealthBody {
  return {
    status: 'ok',
    ok: true,
    service: 'ewurk',
    commit: env.RAILWAY_GIT_COMMIT_SHA?.trim() || env.GIT_COMMIT?.trim() || 'unknown',
    env: deployEnv(env),
    utc: now.toISOString(),
  };
}
