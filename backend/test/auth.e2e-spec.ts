import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL ?? 'user@test.local',
  password: process.env.TEST_USER_PASSWORD ?? 'Test1234*',
};

const TEST_ADMIN = {
  email: process.env.TEST_ADMIN_EMAIL ?? 'admin@test.local',
  password: process.env.TEST_ADMIN_PASSWORD ?? 'Admin1234*',
};

interface AuthSessionResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  function login(credentials: { email: string; password: string }) {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send(credentials);
  }

  it('login con el usuario seeded user@test.local', async () => {
    const response = await login(TEST_USER).expect(201);
    const body = response.body as AuthSessionResponse;

    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.user).toMatchObject({ email: TEST_USER.email });
  });

  it('login con el usuario seeded admin@test.local', async () => {
    const response = await login(TEST_ADMIN).expect(201);
    const body = response.body as AuthSessionResponse;

    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.user).toMatchObject({ email: TEST_ADMIN.email });
  });

  it('GET /api/auth/me responde el perfil usando el token del login', async () => {
    const session = (await login(TEST_USER).expect(201))
      .body as AuthSessionResponse;

    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);

    const profile = me.body as { id: string; email: string };

    expect(profile.id).toBe(session.user.id);
    expect(profile.email).toBe(TEST_USER.email);
    expect(Object.keys(profile)).not.toContain('passwordHash');
  });

  it('login con credenciales inválidas falla con 401', () => {
    return login({
      email: TEST_USER.email,
      password: 'ContrasenaIncorrecta1*',
    }).expect(401);
  });

  it('POST /api/auth/register crea una cuenta nueva de forma independiente', async () => {
    const disposableAccount = {
      name: 'Smoke Register',
      email: `smoke-register-${Date.now()}@test.local`,
      password: 'Register1234*',
    };

    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(disposableAccount)
      .expect(201);

    const body = response.body as AuthSessionResponse;

    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.user.email).toBe(disposableAccount.email);
  });

  it('POST /api/auth/login rechaza payloads inválidos con 400', () => {
    return login({ email: 'no-es-un-correo', password: '123' }).expect(400);
  });
});
