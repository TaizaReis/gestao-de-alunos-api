import request from 'supertest';
import app from '../../src/app.js';

export async function login(email, senha) {
  const resposta = await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send({ email, senha });

  return resposta.body.token;
}

export async function loginAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@escola.com';
  const senha = process.env.ADMIN_PASSWORD || 'admin123';
  return await login(email, senha);
}

export async function loginUsuario(email, senha) {
  return await login(email, senha);
}