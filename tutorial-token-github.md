# Tutorial: Como Gerar seu GitHub Personal Access Token (PAT)

Para que o Dashboard da PampaTec consiga gerir os repositórios e acompanhar o progresso dos times, o sistema precisa de uma "chave de acesso" chamada **Personal Access Token (PAT)**.

Siga os passos abaixo para gerar o seu:

### 1. Acesse as Configurações do GitHub
1. Faça login no seu GitHub.
2. No canto superior direito, clique na sua foto de perfil e selecione **Settings** (Configurações).

### 2. Vá para as Configurações de Desenvolvedor
1. No menu lateral esquerdo, role até o final e clique em **Developer settings**.
2. Clique em **Personal access tokens** e depois em **Tokens (classic)**.
   > **Nota:** Recomendamos usar o "Tokens (classic)" para garantir compatibilidade total com a integração do Dashboard.

### 3. Gere um Novo Token
1. Clique no botão **Generate new token** e selecione **Generate new token (classic)**.
2. No campo **Note**, dê um nome para identificar o token, como: `Dashboard PampaTec - Local`.
3. Defina a **Expiration** (Expiração). Para uso contínuo dos consultores, você pode selecionar "No expiration" ou um período longo (ex: 90 dias).

### 4. Selecione os Escopos (Permissões)
Para o funcionamento correto do Dashboard, você **DEVE** marcar as seguintes opções:

*   [x] **repo**: (Marca todas as caixas de "repo") - Necessário para criar repositórios a partir de templates e ler arquivos privados como o `PROGRESSO_BMC.md`.
*   [x] **read:org**: (Dentro de `admin:org`) - Selecione apenas `read:org` para que o sistema consiga listar os repositórios dentro da organização PampaTec.

### 5. Salve e Copie o Token
1. Role até o final da página e clique em **Generate token**.
2. **IMPORTANTE:** O GitHub mostrará o token apenas **UMA VEZ**. Copie-o imediatamente.
3. Se você fechar a página sem copiar, terá que gerar um novo.

---

### Como usar no Dashboard?
1. Abra o Dashboard no seu navegador (`http://localhost:5173`).
2. Vá até a aba **Configurações**.
3. No campo "Personal Access Token (PAT)", cole o código que você copiou (ele começa com `ghp_`).
4. Clique em **Salvar Configurações**.

O sistema agora está pronto para operar!
