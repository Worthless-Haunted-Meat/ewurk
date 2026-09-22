import net from 'node:net';
import tls from 'node:tls';
import type { Mailer, OutboxEntry } from '../../ports/auth.js';
import { AppError } from '../../http/errors.js';

export interface SmtpMailerConfig {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
}

function runAsyncSync<T>(fn: () => Promise<T>): T {
  const sab = new SharedArrayBuffer(4);
  const slot = new Int32Array(sab);
  let result: T | undefined;
  let error: unknown;
  void fn()
    .then((value) => {
      result = value;
      Atomics.store(slot, 0, 1);
      Atomics.notify(slot, 0);
    })
    .catch((err: unknown) => {
      error = err;
      Atomics.store(slot, 0, 2);
      Atomics.notify(slot, 0);
    });
  Atomics.wait(slot, 0, 0);
  if (error !== undefined) {
    if (error instanceof AppError) throw error;
    throw new AppError('INTERNAL', error instanceof Error ? error.message : 'SMTP send failed.');
  }
  return result as T;
}

function readSmtpResponse(socket: net.Socket): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/).filter((line) => line.length > 0);
      if (lines.length === 0) return;
      const last = lines[lines.length - 1]!;
      if (/^\d{3} /.test(last)) {
        socket.off('data', onData);
        socket.off('error', onError);
        resolve(lines);
      }
    };
    const onError = (err: Error) => {
      socket.off('data', onData);
      reject(err);
    };
    socket.on('data', onData);
    socket.on('error', onError);
  });
}

function writeLine(socket: net.Socket, line: string): void {
  socket.write(`${line}\r\n`);
}

async function smtpSend(config: SmtpMailerConfig, to: string, subject: string, body: string): Promise<void> {
  const socket = net.connect({ host: config.host, port: config.port });
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('error', reject);
  });

  let active: net.Socket = socket;
  const expect = async (codePrefix: string): Promise<void> => {
    const lines = await readSmtpResponse(active);
    const last = lines[lines.length - 1] ?? '';
    if (!last.startsWith(codePrefix)) {
      throw new AppError('INTERNAL', `SMTP unexpected reply: ${lines.join(' | ')}`);
    }
  };

  await expect('220');
  writeLine(active, 'EHLO ewurk.local');
  const ehloLines = await readSmtpResponse(active);
  const lastEhlo = ehloLines[ehloLines.length - 1] ?? '';
  if (!lastEhlo.startsWith('250')) {
    throw new AppError('INTERNAL', `SMTP EHLO failed: ${ehloLines.join(' | ')}`);
  }

  const supportsStartTls = ehloLines.some((l) => l.toUpperCase().includes('STARTTLS'));
  if (supportsStartTls && config.port === 587) {
    writeLine(active, 'STARTTLS');
    await expect('220');
    const tlsSocket = tls.connect({ socket: active, servername: config.host });
    await new Promise<void>((resolve, reject) => {
      tlsSocket.once('secureConnect', () => resolve());
      tlsSocket.once('error', reject);
    });
    active = tlsSocket;
    writeLine(active, 'EHLO ewurk.local');
    await expect('250');
  }

  if (config.user) {
    writeLine(active, 'AUTH LOGIN');
    await expect('334');
    writeLine(active, Buffer.from(config.user, 'utf8').toString('base64'));
    await expect('334');
    writeLine(active, Buffer.from(config.pass ?? '', 'utf8').toString('base64'));
    await expect('235');
  }

  writeLine(active, `MAIL FROM:<${config.from}>`);
  await expect('250');
  writeLine(active, `RCPT TO:<${to}>`);
  await expect('250');
  writeLine(active, 'DATA');
  await expect('354');
  const message = [
    `From: ${config.from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
    '.',
  ].join('\r\n');
  active.write(`${message}\r\n`);
  await expect('250');
  writeLine(active, 'QUIT');
  active.end();
}

export class SmtpMailer implements Mailer {
  constructor(private config: SmtpMailerConfig) {}

  send(to: string, subject: string, body: string): void {
    runAsyncSync(() => smtpSend(this.config, to, subject, body));
  }

  list(): OutboxEntry[] {
    return [];
  }
}
