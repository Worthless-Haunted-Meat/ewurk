/** True when an env var is set to anything other than empty, `0`, `false`, or `no`. */
export function isEnvFlagOn(raw: string | undefined): boolean {
  const value = raw?.trim().toLowerCase();
  return !!value && value !== '0' && value !== 'false' && value !== 'no';
}
