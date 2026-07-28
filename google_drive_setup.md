# Guia de Configuração - Envio Automático para a Pasta do Google Drive (Com Anexos)

Este guia ensina o passo a passo para configurar o **Google Apps Script** gratuito para que, sempre que um cliente preencher o formulário no seu site, **os dados da empresa** e **todos os documentos anexados (CNH, RG, Comprovante de Endereço, IPTU)** sejam salvos automaticamente em uma pasta no seu Google Drive!

---

## Passo 1: Criar ou Escolher a Pasta no Seu Google Drive

1. Acesse o [Google Drive](https://drive.google.com/) e crie uma pasta chamada **"Abertura de Empresas - Clientes"**.
2. Abra a pasta e copie o link do navegador ou o **ID da pasta** (os números/letras no final do link depois de `/folders/`).

---

## Passo 2: Criar o Script do Google Apps Script

1. Acesse [script.google.com](https://script.google.com/) e clique em **"Novo Projeto"**.
2. Apague todo o código que estiver lá e cole o código abaixo:

```javascript
function doGet(e) {
  return ContentService.createTextOutput("O Webhook de Abertura de Empresa está ativo e pronto para receber dados e documentos!")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  var data = {};
  try {
    var contents = e.postData ? e.postData.contents : "";
    data = contents ? JSON.parse(contents) : {};
  } catch (err) {
    data = { aviso: "Erro ao interpretar dados enviados" };
  }
  return salvarNoDrive(data);
}

function salvarNoDrive(data) {
  try {
    // -------------------------------------------------------------------------
    // 1. COLE AQUI O LINK DA SUA PASTA DO GOOGLE DRIVE (OU APENAS O ID):
    // (Se deixar como está ou em branco, o script criará a pasta "Abertura de Empresas - Clientes" no seu Drive automaticamente)
    // -------------------------------------------------------------------------
    var PASTA_INPUT = "COLE_O_LINK_OU_ID_DA_SUA_PASTA_AQUI"; 
    
    var folderId = extrairFolderId(PASTA_INPUT);
    var parentFolder;
    
    if (folderId) {
      try {
        parentFolder = DriveApp.getFolderById(folderId);
      } catch (fErr) {
        parentFolder = obterOuCriarPastaPadrao();
      }
    } else {
      parentFolder = obterOuCriarPastaPadrao();
    }

    // -------------------------------------------------------------------------
    // 2. Criar Subpasta Exclusiva para este Cliente (Organização Automática)
    // -------------------------------------------------------------------------
    var nomeCliente = (data.socios && data.socios[0] && data.socios[0].nome) || "Cliente";
    var nomeEmpresa = (data.dadosNomes && data.dadosNomes.razaoOpcao1) || data.razaoSocial || "Empresa_Nova";
    var dataHoje = Utilities.formatDate(new Date(), "GMT-3", "yyyy-MM-dd");
    
    // Nome da subpasta ex: [2026-07-28] Moda Paulista LTDA - João da Silva
    var subfolderName = "[" + dataHoje + "] " + nomeEmpresa.replace(/[\/\\:*?"<>|]/g, "_").trim() + " - " + nomeCliente.replace(/[\/\\:*?"<>|]/g, "_").trim();
    
    var clientFolder = parentFolder.createFolder(subfolderName);
    var fileName = "Ficha_Abertura_" + nomeEmpresa.replace(/[^a-zA-Z0-9]/g, "_");

    // -------------------------------------------------------------------------
    // 3. Monta o Dossiê em PDF Completo e Detalhado para a Contabilidade
    // -------------------------------------------------------------------------
    var dataFormatada = new Date().toLocaleDateString('pt-BR');
    var protocolo = "AB-" + new Date().getTime().toString().substr(-6);

    var html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; padding: 25px; line-height: 1.4; font-size: 11px; }
          .header { text-align: center; border-bottom: 3px solid #059669; padding-bottom: 12px; margin-bottom: 15px; }
          .title { color: #065f46; font-size: 20px; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .subtitle { color: #475569; font-size: 12px; margin-top: 4px; font-weight: 500; }
          .protocol-bar { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 6px 12px; border-radius: 4px; display: table; width: 100%; margin-bottom: 15px; }
          .protocol-cell { display: table-cell; font-size: 10px; color: #166534; }
          .section-title { background: #059669; color: #ffffff; padding: 6px 10px; font-size: 12px; font-weight: bold; margin-top: 16px; margin-bottom: 8px; border-radius: 3px; }
          .grid { display: table; width: 100%; border-collapse: collapse; margin-top: 4px; }
          .row { display: table-row; }
          .cell { display: table-cell; padding: 5px 8px; font-size: 10.5px; width: 50%; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
          .cell-full { display: table-cell; padding: 6px 8px; font-size: 10.5px; width: 100%; border-bottom: 1px solid #f1f5f9; }
          .label { font-weight: bold; color: #1e293b; display: inline-block; width: 150px; }
          .val { color: #334155; }
          .partner-card { border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; margin-top: 8px; background: #f8fafc; }
          .badge-role { display: inline-block; background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 3px; font-size: 9.5px; font-weight: bold; float: right; }
          .mercadoria-box { background: #fffbeb; border: 1px solid #fde68a; padding: 8px; border-radius: 5px; margin-top: 6px; color: #92400e; font-size: 10px; }
          .footer { margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center; font-size: 9px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">DOSSIÊ COMPLETO DE ABERTURA DE EMPRESA</div>
          <div class="subtitle">Ficha Simplificada do Cliente & Coleta de Documentos</div>
        </div>

        <div class="protocol-bar">
          <div class="protocol-cell" style="width: 50%;"><b>Protocolo:</b> ${protocolo}</div>
          <div class="protocol-cell" style="width: 50%; text-align: right;"><b>Data de Emissão:</b> ${dataFormatada}</div>
        </div>

        <!-- 1. SÓCIOS / PROPRIETÁRIO -->
        <div class="section-title">1. ESTRUTURA SOCIETÁRIA & EMPRESÁRIO</div>
        <div style="margin-bottom: 6px;"><b>Tipo de Quadro Societário:</b> ${data.haveraSocios || 'Empresa Individual'}</div>

        ${(data.socios || []).map(function(s, i) {
          var papelLabel = s.papelSocio === 'Mercadoria' ? '📦 Sócio Mercadoria / Produtos' : 
                          s.papelSocio === 'Capital' ? '💰 Sócio de Capital' : 
                          s.papelSocio === 'Misto' ? '⚡ Sócio Misto' : '💼 Sócio de Serviço / Trabalho';

          return '<div class="partner-card">' +
                 '<div style="margin-bottom: 4px;">' +
                 '<b style="font-size: 11.5px; color: #065f46;">' + (data.haveraSocios && data.haveraSocios.indexOf('Não') !== -1 ? 'Empresário / Titular Único' : ('Sócio ' + (i+1) + ': ' + (s.nome || 'Não informado'))) + '</b>' +
                 '<span class="badge-role">' + papelLabel + '</span>' +
                 '</div>' +
                 '<div class="grid">' +
                   '<div class="row">' +
                     '<div class="cell"><span class="label">CPF:</span> <span class="val">' + (s.cpf || '-') + '</span></div>' +
                     '<div class="cell"><span class="label">RG ou CNH:</span> <span class="val">' + (s.rg || '-') + '</span></div>' +
                   '</div>' +
                   '<div class="row">' +
                     '<div class="cell"><span class="label">Data de Nascimento:</span> <span class="val">' + (s.dataNascimento || '-') + '</span></div>' +
                     '<div class="cell"><span class="label">Estado Civil:</span> <span class="val">' + (s.estadoCivil || '-') + '</span></div>' +
                   '</div>' +
                   '<div class="row">' +
                     '<div class="cell"><span class="label">Profissão:</span> <span class="val">' + (s.profissao || '-') + '</span></div>' +
                     '<div class="cell"><span class="label">% Cotas no Capital:</span> <span class="val">' + (s.percentualCapital || 100) + '%</span></div>' +
                   '</div>' +
                   '<div class="row">' +
                     '<div class="cell"><span class="label">Telefone / WhatsApp:</span> <span class="val">' + (s.telefone || '-') + '</span></div>' +
                     '<div class="cell"><span class="label">E-mail:</span> <span class="val">' + (s.email || '-') + '</span></div>' +
                   '</div>' +
                   '<div class="row">' +
                     '<div class="cell" style="width: 100%; display: table-cell;" colspan="2"><span class="label">Endereço Residencial:</span> <span class="val">' + (s.endereco || '-') + '</span></div>' +
                   '</div>' +
                 '</div>' +
                 (s.descricaoMercadoria ? '<div class="mercadoria-box"><b>📦 Mercadorias / Produtos do Sócio:</b> ' + s.descricaoMercadoria + '</div>' : '') +
                 '</div>';
        }).join('')}

        <div style="margin-top: 8px; background: #f1f5f9; padding: 6px 10px; border-radius: 4px;">
          <b>Possui débitos/restrições fiscais?</b> ${(data.verificacoesSimples && data.verificacoesSimples.debitosFiscais) || 'Não'} &nbsp;|&nbsp;
          <b>É servidor público ativo?</b> ${(data.verificacoesSimples && data.verificacoesSimples.servidorPublico) || 'Não'}
        </div>

        <!-- 2. O NEGÓCIO & OPERAÇÃO -->
        <div class="section-title">2. DETALHAMENTO DO NEGÓCIO & OPERAÇÃO</div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
          <b>Descrição Geral do que a Empresa Fará:</b><br>
          <span class="val">${(data.dadosOperacionais && data.dadosOperacionais.oQueEmpresaFara) || 'Não informado'}</span>
        </div>

        <div class="grid">
          <div class="row">
            <div class="cell"><span class="label">Tipo de Atendimento:</span> <span class="val">${(data.dadosOperacionais && data.dadosOperacionais.tipoOperacao) || '-'}</span></div>
            <div class="cell"><span class="label">Modo de Execução:</span> <span class="val">${(data.dadosOperacionais && data.dadosOperacionais.modoExecucao) || '-'}</span></div>
          </div>
          <div class="row">
            <div class="cell"><span class="label">Produtos Comercializados:</span> <span class="val">${(data.dadosOperacionais && data.dadosOperacionais.quaisProdutos) || 'Nenhum'}</span></div>
            <div class="cell"><span class="label">Serviços Prestados:</span> <span class="val">${(data.dadosOperacionais && data.dadosOperacionais.quaisServicos) || 'Nenhum'}</span></div>
          </div>
          <div class="row">
            <div class="cell"><span class="label">Estoque no Local:</span> <span class="val">${(data.dadosOperacionais && data.dadosOperacionais.estoqueLocal) || '-'}</span></div>
            <div class="cell"><span class="label">Contratação de Funcionários:</span> <span class="val">${(data.dadosOperacionais && data.dadosOperacionais.funcionarios) || '-'}</span></div>
          </div>
        </div>

        <!-- 3. ENDEREÇO & NOMES PREFERENCIAIS -->
        <div class="section-title">3. ENDEREÇO DA SEDE & NOMES (JUNTA COMERCIAL)</div>
        <div class="grid">
          <div class="row">
            <div class="cell"><span class="label">1ª Opção Razão Social:</span> <span class="val"><b>${(data.dadosNomes && data.dadosNomes.razaoOpcao1) || '-'}</b></span></div>
            <div class="cell"><span class="label">2ª Opção Razão Social:</span> <span class="val">${(data.dadosNomes && data.dadosNomes.razaoOpcao2) || '-'}</span></div>
          </div>
          <div class="row">
            <div class="cell"><span class="label">Nome Fantasia:</span> <span class="val"><b>${(data.dadosNomes && data.dadosNomes.nomeFantasia) || '-'}</b></span></div>
            <div class="cell"><span class="label">Inscrição IPTU:</span> <span class="val">${(data.enderecoEmpresa && data.enderecoEmpresa.inscricaoIptu) || 'Não informado'}</span></div>
          </div>
          <div class="row">
            <div class="cell"><span class="label">Uso / Vínculo do Imóvel:</span> <span class="val">${(data.enderecoEmpresa && data.enderecoEmpresa.usoImovel) || '-'}</span></div>
            <div class="cell"><span class="label">CEP:</span> <span class="val">${(data.enderecoEmpresa && data.enderecoEmpresa.cep) || '-'}</span></div>
          </div>
          <div class="row">
            <div class="cell" style="width: 100%; display: table-cell;" colspan="2">
              <span class="label">Endereço Completo:</span> <span class="val">${(data.enderecoEmpresa && data.enderecoEmpresa.logradouro) || ''}, ${(data.enderecoEmpresa && data.enderecoEmpresa.bairro) || ''} - ${(data.enderecoEmpresa && data.enderecoEmpresa.municipioUf) || ''}</span>
            </div>
          </div>
        </div>

        <!-- 4. ESTIMATIVAS INICIAIS -->
        <div class="section-title">4. ESTIMATIVAS INICIAIS & INVESTIMENTO</div>
        <div class="grid">
          <div class="row">
            <div class="cell"><span class="label">Capital Social Estimado:</span> <span class="val">R$ ${(data.estimativaInicial && data.estimativaInicial.capitalSocial || 10000).toLocaleString('pt-BR')}</span></div>
            <div class="cell"><span class="label">Previsão de Faturamento:</span> <span class="val">R$ ${(data.estimativaInicial && data.estimativaInicial.faturamentoMensalPrevisto || '-')}</span></div>
          </div>
        </div>

        <!-- 5. ANEXOS -->
        <div class="section-title">5. DOCUMENTOS ANEXADOS & SALVOS NO GOOGLE DRIVE</div>
        ${(function() {
          var lista = data.anexos || data.documentosAnexadosFiles || [];
          if (!lista.length) return '<div><i>Nenhum documento anexado.</i></div>';
          var htmlDocs = '<div style="margin-top: 4px;">';
          for (var k = 0; k < lista.length; k++) {
            var docItem = lista[k];
            htmlDocs += '<div style="padding: 4px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 3px;">' +
                        '📎 <b>' + (docItem.categoria || 'Documento') + ':</b> ' + (docItem.nomeArquivo || docItem.fileName || ('Arquivo_' + (k+1))) +
                        '</div>';
          }
          htmlDocs += '</div>';
          return htmlDocs;
        })()}

        <div class="footer">
          Relatório Técnico de Solicitação de Abertura de Empresa • Gerado via Webhook para a Contabilidade
        </div>
      </body>
      </html>
    `;

    // -------------------------------------------------------------------------
    // 4. Salva o PDF do Formulário Dentro da Subpasta do Cliente
    // -------------------------------------------------------------------------
    var blob = Utilities.newBlob(html, "text/html", fileName + ".html");
    var pdfFile = clientFolder.createFile(blob.getAs("application/pdf")).setName(fileName + ".pdf");

    // -------------------------------------------------------------------------
    // 5. Salva TODOS os arquivos anexados dentro da Subpasta do Cliente!
    // -------------------------------------------------------------------------
    var listaAnexos = data.anexos || data.documentosAnexadosFiles || [];
    var anexosCriados = [];

    for (var i = 0; i < listaAnexos.length; i++) {
      var doc = listaAnexos[i];
      if (doc.base64) {
        try {
          var nomeComCat = (doc.categoria ? ("[" + doc.categoria.replace(/[^a-zA-Z0-9]/g, "_") + "]_") : "") + (doc.nomeArquivo || doc.fileName || ("Anexo_" + (i+1)));
          var mime = doc.mimeType || doc.fileType || "application/pdf";
          var fileBlob = Utilities.newBlob(Utilities.base64Decode(doc.base64), mime, nomeComCat);
          var createdFile = clientFolder.createFile(fileBlob);
          anexosCriados.push(createdFile.getName());
        } catch (docErr) {
          Logger.log("Erro ao salvar anexo: " + docErr.toString());
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      message: "Subpasta criada e documentos salvos com sucesso no Google Drive!",
      folderName: clientFolder.getName(),
      fileName: pdfFile.getName(),
      anexosContagem: anexosCriados.length
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Erro geral: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Busca a pasta "Abertura de Empresas - Clientes" ou cria uma automaticamente se não existir
function obterOuCriarPastaPadrao() {
  var pastas = DriveApp.getFoldersByName("Abertura de Empresas - Clientes");
  if (pastas.hasNext()) {
    return pastas.next();
  } else {
    return DriveApp.createFolder("Abertura de Empresas - Clientes");
  }
}

// Extrai o ID da pasta do Google Drive
function extrairFolderId(input) {
  if (!input || input === "COLE_O_LINK_OU_ID_DA_SUA_PASTA_AQUI") return "";
  var str = input.trim();
  var matchFolders = str.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (matchFolders && matchFolders[1]) return matchFolders[1];
  var matchId = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) return matchId[1];
  if (/^[a-zA-Z0-9_-]+$/.test(str)) return str;
  return "";
}
```

---

## Passo 3: Publicar a URL do Webhook

1. No menu superior do Google Apps Script, clique no botão azul **"Implantar" > "Nova implantação"**.
2. Clique no ícone de engrenagem ⚙️ ao lado de "Selecione o tipo" e escolha **"App da Web"**.
3. Preencha as opções assim:
   - **Descrição**: Webhook de Abertura de Empresa
   - **Executar como**: **Eu (seu e-mail)**
   - **Quem tem acesso**: **Qualquer pessoa** *(Isso é necessário para o formulário do site enviar os arquivos sem exigir login do Google do cliente)*.
4. Clique em **"Implantar"** e autorize as permissões de acesso ao seu Google Drive.
5. Copie a **URL do app da Web** gerada (que termina em `/exec`).

---

## Passo 4: Configurar a URL do Webhook no Projeto (`app.js`)

1. Abra o arquivo [app.js](file:///c:/projetos%20GitHub/plano_abertura_empresa/plano_abertura_empresa/app.js) no seu editor de código.
2. Na **linha 5**, cole a URL do Webhook copiada (que termina em `/exec`) dentro das aspas da constante `DEFAULT_WEBHOOK_URL`:
   ```javascript
   const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/SUA_URL_DO_WEBHOOK/exec';
   ```
3. Salve o arquivo `app.js` e faça o `git commit` / `push` para atualizar o seu site online.

Pronto! Agora o seu site online enviará todas as solicitações e documentos anexados diretamente para a pasta do seu Google Drive de forma 100% automática e transparente para o cliente!

