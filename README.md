# PampaTec Dashboard

Dashboard para acompanhamento da jornada de pré-incubação do PampaTec.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Deploy no Render.com

Este repositório já contém um arquivo `render.yaml` configurado para **Blueprints**.

1. Crie uma conta no [Render.com](https://render.com).
2. Vá em **Blueprints** no painel do Render.
3. Conecte este repositório do GitHub.
4. O Render detectará automaticamente o arquivo `render.yaml` e criará o Static Site.

O sistema de rotas (SPA) já está configurado para redirecionar todas as chamadas para o `index.html`.
