// Banco exclusivo dos testes de integração, que apagam os dados a cada teste.
// Usa TEST_DATABASE_URL se existir; senão, o banco do DATABASE_URL com o
// sufixo "_test" (ex.: morae → morae_test).
export function testDatabaseUrl(): string {
  const raw = process.env['TEST_DATABASE_URL'] ?? process.env['DATABASE_URL'];
  if (!raw) {
    throw new Error('Defina DATABASE_URL ou TEST_DATABASE_URL no .env.');
  }

  const url = new URL(raw);
  if (!url.pathname.endsWith('_test')) {
    url.pathname = `${url.pathname}_test`;
  }
  return url.toString();
}

// Trava de segurança: nunca limpar um banco que não seja de testes.
export function assertTestDatabase(databaseUrl: string | undefined): void {
  if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test')) {
    throw new Error(
      'Os testes de integração só rodam em um banco cujo nome termina em _test.',
    );
  }
}
