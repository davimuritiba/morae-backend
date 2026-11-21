import 'dotenv/config';
import * as argon2 from 'argon2';
import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL não definida.');
}

const pool = new Pool({ connectionString });
const timestamp = '2026-11-06T17:00:00.000Z';
const adminPasswordHash = await argon2.hash('Admin@123');
const passwordHash = await argon2.hash('senha-segura-123');

const users = [
  ['11111111-1111-4111-8111-111111111111', 'Mariana Albuquerque', 'mariana.albuquerque@example.com', '52998224725', '82999990001'],
  ['22222222-2222-4222-8222-222222222222', 'Ana Beatriz Lima', 'ana.lima@example.com', '11144477735', '82999990002'],
  ['33333333-3333-4333-8333-333333333333', 'Lucas Henrique Santos', 'lucas.santos@example.com', '16899535009', '82999990003'],
  ['44444444-4444-4444-8444-444444444444', 'Sofia Carvalho Mendes', 'sofia.mendes@example.com', '93541134780', '82999990004'],
  ['55555555-5555-4555-8555-555555555555', 'Admin', 'admin@morae.com', '39053344705', '82999990005'],
];

const students = [
  [
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    users[1][0],
    '202610001',
    'Arquitetura e Urbanismo',
    5,
    '2028-12-15',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'Organizada, tranquila e cuidadosa com os espaços comuns.',
    1800,
    500,
    900,
    false,
    2,
    2,
    { MONDAY: [{ start: '08:00', end: '18:00' }] },
  ],
  [
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    users[2][0],
    '202610002',
    'Engenharia Civil',
    7,
    '2027-12-15',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'Sociável, responsável e interessado em dividir tarefas.',
    2200,
    550,
    950,
    false,
    3,
    3,
    { TUESDAY: [{ start: '08:00', end: '18:00' }] },
  ],
  [
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    users[3][0],
    '202610003',
    'Medicina',
    3,
    '2030-12-15',
    '99999999-9999-4999-8999-999999999999',
    'Estudiosa, não fumante e comprometida com uma boa convivência.',
    2500,
    600,
    1000,
    false,
    1,
    2,
    { WEDNESDAY: [{ start: '08:00', end: '20:00' }] },
  ],
];

const admins = [
  [
    '77777777-7777-4777-8777-777777777777',
    users[4][0],
    'admin',
    adminPasswordHash,
  ],
];

async function main() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const [id, name, email, cpf, phone] of users) {
      await client.query(
        `INSERT INTO users (id, name, email, cpf, password_hash, phone, email_verified, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, 'ACTIVE', $7, $7)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, cpf = EXCLUDED.cpf,
           phone = EXCLUDED.phone, email_verified = true, status = 'ACTIVE', updated_at = EXCLUDED.updated_at`,
        [id, name, email, cpf, passwordHash, phone, timestamp],
      );
    }

    await client.query(
      `INSERT INTO property_owners (id, user_id, verification_status, created_at, updated_at)
       VALUES ($1, $2, 'VERIFIED', $3, $3)
       ON CONFLICT (user_id) DO UPDATE SET verification_status = 'VERIFIED', updated_at = EXCLUDED.updated_at`,
      ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', users[0][0], timestamp],
    );

    for (const [
      id,
      userId,
      enrollment,
      course,
      period,
      graduation,
      profileId,
      bio,
      income,
      minBudget,
      maxBudget,
      smoker,
      noise,
      visits,
      schedule,
    ] of students) {
      await client.query(
        `INSERT INTO students (id, user_id, enrollment_number, course, period, expected_graduation, verification_status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'VERIFIED', $7, $7)
         ON CONFLICT (user_id) DO UPDATE SET enrollment_number = EXCLUDED.enrollment_number, course = EXCLUDED.course,
           period = EXCLUDED.period, expected_graduation = EXCLUDED.expected_graduation,
           verification_status = 'VERIFIED', updated_at = EXCLUDED.updated_at`,
        [id, userId, enrollment, course, period, graduation, timestamp],
      );
      await client.query(
        `INSERT INTO student_profiles (id, student_id, bio, income, min_budget, max_budget, is_smoker, noise_preference, visit_preference, schedule, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (student_id) DO UPDATE SET bio = EXCLUDED.bio, income = EXCLUDED.income,
           min_budget = EXCLUDED.min_budget, max_budget = EXCLUDED.max_budget, is_smoker = EXCLUDED.is_smoker,
           noise_preference = EXCLUDED.noise_preference, visit_preference = EXCLUDED.visit_preference,
           schedule = EXCLUDED.schedule, updated_at = EXCLUDED.updated_at`,
        [
          profileId,
          id,
          bio,
          income,
          minBudget,
          maxBudget,
          smoker,
          noise,
          visits,
          JSON.stringify(schedule),
          timestamp,
        ],
      );
    }

    await client.query(
      `INSERT INTO residences (id, postal_code, state, street, number, complement, city, neighborhood, created_at, updated_at)
       VALUES ($1, '57035120', 'AL', 'Rua Professor Sandoval Arroxelas', '120', 'Apt. 302', 'Maceió', 'Ponta Verde', $2, $2)
       ON CONFLICT (id) DO UPDATE SET updated_at = EXCLUDED.updated_at`,
      ['77777777-7777-4777-8777-777777777777', timestamp],
    );
    await client.query(
      `INSERT INTO properties (id, residence_id, owner_id, housing_type, bedrooms, bathrooms, parking_spaces, amenities, created_at, updated_at)
       VALUES ($1, $2, $3, 'APARTMENT', 4, 2, 1, $4, $5, $5)
       ON CONFLICT (residence_id) DO UPDATE SET housing_type = EXCLUDED.housing_type, bedrooms = EXCLUDED.bedrooms,
         bathrooms = EXCLUDED.bathrooms, parking_spaces = EXCLUDED.parking_spaces, amenities = EXCLUDED.amenities,
         updated_at = EXCLUDED.updated_at`,
      [
        '88888888-8888-4888-8888-888888888888',
        '77777777-7777-4777-8777-777777777777',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        ['Wi-Fi', 'Área de estudos', 'Lavanderia'],
        timestamp,
      ],
    );

    for (const user of users.slice(1, 4)) {
      await client.query(
        `INSERT INTO property_cohabitants (property_id, user_id, created_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (property_id, user_id) DO NOTHING`,
        ['88888888-8888-4888-8888-888888888888', user[0], timestamp],
      );
    }

    const paymentTransactions = [
      [
        '10101010-1010-4010-8010-101010101001',
        users[1][0],
        users[0][0],
        'Aluguel · Novembro/2026',
        700,
        'PAID',
        'PIX',
        '2026-11-02',
        '2026-11-02T12:00:00.000Z',
      ],
      [
        '10101010-1010-4010-8010-101010101002',
        users[2][0],
        users[0][0],
        'Aluguel · Novembro/2026',
        600,
        'PENDING',
        'BOLETO',
        '2026-11-10',
        null,
      ],
      [
        '10101010-1010-4010-8010-101010101003',
        users[1][0],
        users[0][0],
        'Aluguel · Outubro/2026',
        700,
        'PAID',
        'PIX',
        '2026-10-02',
        '2026-10-02T12:00:00.000Z',
      ],
      [
        '10101010-1010-4010-8010-101010101004',
        users[3][0],
        users[0][0],
        'Aluguel · Setembro/2026',
        500,
        'OVERDUE',
        'BOLETO',
        '2026-09-10',
        null,
      ],
    ];

    for (const [
      id,
      payerId,
      payeeId,
      description,
      amount,
      status,
      method,
      date,
      paidAt,
    ] of paymentTransactions) {
      await client.query(
        `INSERT INTO payment_transactions
           (id, payer_id, payee_id, description, amount, status, payment_method, transaction_date, paid_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           payer_id = EXCLUDED.payer_id, payee_id = EXCLUDED.payee_id,
           description = EXCLUDED.description, amount = EXCLUDED.amount,
           status = EXCLUDED.status, payment_method = EXCLUDED.payment_method,
           transaction_date = EXCLUDED.transaction_date, paid_at = EXCLUDED.paid_at`,
        [
          id,
          payerId,
          payeeId,
          description,
          amount,
          status,
          method,
          date,
          paidAt,
          timestamp,
        ],
      );
    }

    for (const admin of admins) {
      await client.query(
        `INSERT INTO administrators (id, user_id, login, password_hash, permissions, created_at, updated_at)
         VALUES ($1, $2, $3, $4, ARRAY['VERIFY_DOCUMENTS','MODERATE_LISTINGS','MANAGE_USERS','VIEW_REPORTS']::"Permission"[], $5, $5)
         ON CONFLICT (login) DO NOTHING`,
        [admin[0], admin[1], admin[2], admin[3], timestamp],
      );
    }

    await client.query('COMMIT');
    console.log(
      'Seed concluído: 1 proprietário, 3 estudantes, 1 imóvel e 4 transações demonstrativas.',
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

try {
  await main();
} finally {
  await pool.end();
}
