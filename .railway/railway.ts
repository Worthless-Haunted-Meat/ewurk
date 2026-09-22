import { defineRailway, github, preserve, project, service, volume } from 'railway/iac';

export default defineRailway((ctx) => {
  const prod = ctx.isEnvironment('production');
  const uat = ctx.isEnvironment('uat');

  const data = volume('ewurk-data');

  const domains = prod
    ? ['ewurk.org', 'www.ewurk.org']
    : uat
      ? ['uat.ewurk.org']
      : ['dev.ewurk.org'];

  const publicUrl = prod ? 'https://ewurk.org' : uat ? 'https://uat.ewurk.org' : 'https://dev.ewurk.org';

  const ewurk = service('ewurk', {
    source: github('Worthless-Haunted-Meat/ewurk', { branch: 'main' }),
    build: 'npm run build',
    start: 'npm start',
    healthcheck: '/health',
    domains,
    volumeMounts: {
      '/data': data,
    },
    env: {
      EWURK_DB_PATH: '/data/ewurk.db',
      NODE_ENV: prod ? 'production' : 'development',
      EWURK_PUBLIC_URL: publicUrl,
      ...(prod ? {} : { EWURK_SEED_ON_BOOT: 'true' }),
      SMTP_HOST: preserve(),
      SMTP_PORT: preserve(),
      SMTP_USER: preserve(),
      SMTP_PASS: preserve(),
      SMTP_FROM: preserve(),
    },
  });

  return project('ewurk', {
    resources: [data, ewurk],
  });
});
