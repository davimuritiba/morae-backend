// Leitura das variáveis de ambiente. Os providers chamam estas funções ao
// montar o módulo, então uma configuração faltando derruba a aplicação na
// subida, em vez de quebrar só quando a funcionalidade for usada.

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function requireEnv(name: string): string {
  const value = optionalEnv(name);
  if (value === undefined) {
    throw new Error(`Variável de ambiente ${name} não definida.`);
  }
  return value;
}

// Inteiro positivo. Sem `fallback`, a variável é obrigatória.
export function envPositiveInt(name: string, fallback?: number): number {
  const raw = optionalEnv(name);
  if (raw === undefined) {
    if (fallback === undefined) {
      throw new Error(`Variável de ambiente ${name} não definida.`);
    }
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} precisa ser um inteiro positivo.`);
  }
  return value;
}

export function envBoolean(name: string, fallback: boolean): boolean {
  const raw = optionalEnv(name);
  if (raw === undefined) return fallback;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(`${name} precisa ser true ou false.`);
}
