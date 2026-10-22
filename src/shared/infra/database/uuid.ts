const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// As colunas de id são do tipo uuid: consultar com um texto que não é UUID
// faz o Postgres lançar erro. Os repositórios checam antes e devolvem null.
export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}
