import mongoose from 'mongoose';
import request from 'supertest';
import { expect } from 'chai';
import app from '../src/app.js';
import { loginAdmin, loginUsuario } from './helpers/authHelper.js';
import massaDados from './data/alunoTrabalho.json' with { type: 'json' };

describe('Missão: Fluxo de Entrega de Trabalho pelo Aluno', function () {
  this.timeout(15000); // Define timeout para toda a suíte de forma segura

  let tokenAdmin;
  let disciplinaId;

  before(async function () {
    // Aguarda a ligação do MongoDB se ainda não estiver ativa (readyState 1 = connected)
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once('open', resolve));
    }

    // 1. Login do Administrador via Helper
    tokenAdmin = await loginAdmin();
    expect(tokenAdmin, 'Token de admin não gerado').to.be.a('string');

    // Cria disciplina prévia com código único para evitar erro de duplicidade
    const timestamp = Date.now();
    const resDisciplina = await request(app)
      .post('/api/admin/disciplinas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        codigo: `DISC_${timestamp}`,
        nome: `Automação de Testes de API ${timestamp}`
      });

    expect(resDisciplina.status, JSON.stringify(resDisciplina.body)).to.equal(201);
    disciplinaId = resDisciplina.body.id || resDisciplina.body._id;
  });

  massaDados.forEach((cenario, i) => {
    it(`Cenário ${i + 1}: Cadastrar ${cenario.aluno.nome}, logar como aluno e entregar trabalho`, async () => {
      // Gera e-mail e matrícula únicos a cada execução para não falhar por unicidade
      const timestamp = Date.now() + i;
      const payloadAluno = {
        ...cenario.aluno,
        email: `aluno_${timestamp}@teste.com`,
        matricula: `MAT_${timestamp}`
      };

      // 2. Admin cadastra o aluno
      const resAluno = await request(app)
        .post('/api/admin/alunos')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(payloadAluno);

      expect(resAluno.status, JSON.stringify(resAluno.body)).to.equal(201);
      const alunoId = resAluno.body.id || resAluno.body._id;

      // 3. Admin matricula o aluno na disciplina
      const resMatricula = await request(app)
        .post(`/api/admin/disciplinas/${disciplinaId}/matriculas`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ alunoId });

      expect(resMatricula.status, JSON.stringify(resMatricula.body)).to.equal(201);

      // 4. Logar como o aluno via Helper
      const tokenAluno = await loginUsuario(payloadAluno.email, payloadAluno.senha);
      expect(tokenAluno, 'Token do aluno não gerado').to.be.a('string');

      // 5. Aluno registra a entrega do trabalho
      const resTrabalho = await request(app)
        .post(`/api/alunos/${alunoId}/trabalhos`)
        .set('Authorization', `Bearer ${tokenAluno}`)
        .send({
          disciplinaId,
          titulo: cenario.trabalho.titulo,
          descricao: cenario.trabalho.descricao
        });

      expect(resTrabalho.status, JSON.stringify(resTrabalho.body)).to.equal(201);
      expect(resTrabalho.body).to.have.property('id');
      expect(resTrabalho.body.titulo).to.equal(cenario.trabalho.titulo);
    });
  });
});