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
    // -------------------------------------------------------------------------
    var PASTA_INPUT = "COLE_O_LINK_OU_ID_DA_SUA_PASTA_AQUI"; 
    
    var folderId = extrairFolderId(PASTA_INPUT);
    var folder;
    
    try {
      if (folderId && folderId !== "COLE_O_LINK_OU_ID_DA_SUA_PASTA_AQUI") {
        folder = DriveApp.getFolderById(folderId);
      } else {
        folder = DriveApp.getRootFolder();
      }
    } catch (fErr) {
      folder = DriveApp.getRootFolder();
    }

    var empresaNome = (data.dadosNomes && data.dadosNomes.razaoOpcao1) || data.razaoSocial || "Empresa_Nova";
    var fileName = "Ficha_Abertura_" + empresaNome.replace(/[^a-zA-Z0-9]/g, "_");

    // -------------------------------------------------------------------------
    // 2. Monta o Dossiê em PDF para a Contabilidade
    // -------------------------------------------------------------------------
    var html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; padding: 25px; line-height: 1.4; }
          .header { text-align: center; border-bottom: 3px solid #059669; padding-bottom: 12px; margin-bottom: 20px; }
          .title { color: #065f46; font-size: 20px; font-weight: bold; margin: 0; }
          .subtitle { color: #64748b; font-size: 12px; margin-top: 4px; }
          .section-title { background: #ecfdf5; color: #065f46; padding: 6px 10px; font-size: 13px; font-weight: bold; border-left: 4px solid #10b981; margin-top: 18px; }
          .grid { display: table; width: 100%; margin-top: 8px; }
          .row { display: table-row; }
          .cell { display: table-cell; padding: 5px 8px; font-size: 11px; width: 50%; }
          .label { font-weight: bold; color: #334155; }
          .partner-card { border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; margin-top: 8px; font-size: 11px; background: #f8fafc; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">SOLICITAÇÃO DE ABERTURA DE EMPRESA</div>
          <div class="subtitle">Ficha Simplificada do Cliente & Coleta de Documentos</div>
        </div>

        <div class="section-title">1. DADOS DOS SÓCIOS / PROPRIETÁRIO</div>
        ${(data.socios || []).map(function(s, i) {
          return '<div class="partner-card">' +
                 '<b>' + (data.haveraSocios && data.haveraSocios.indexOf('Não') !== -1 ? 'Proprietário / Titular Único' : ('Sócio ' + (i+1))) + ':</b> ' + (s.nome || '-') + ' (' + (s.percentualCapital || 100) + '% das Cotas)<br>' +
                 '<b>CPF:</b> ' + (s.cpf || '-') + ' | <b>RG/CNH:</b> ' + (s.rg || '-') + ' | <b>Data Nasc:</b> ' + (s.dataNascimento || '-') + '<br>' +
                 '<b>Estado Civil:</b> ' + (s.estadoCivil || '-') + ' | <b>Profissão:</b> ' + (s.profissao || '-') + '<br>' +
                 '<b>Telefone/WhatsApp:</b> ' + (s.telefone || '-') + ' | <b>E-mail:</b> ' + (s.email || '-') + '<br>' +
                 '<b>Endereço Residencial:</b> ' + (s.endereco || '-') + '<br>' +
                 '<b>Papel no Negócio:</b> ' + (s.papelSocio || 'Titular') +
                 (s.descricaoMercadoria ? '<br><b style="color:#b45309;">📦 Mercadorias/Produtos do Sócio:</b> ' + s.descricaoMercadoria : '') +
                 '</div>';
        }).join('')}

        <div class="section-title">2. SOBRE O NEGÓCIO & OPERAÇÃO</div>
        <div class="grid">
          <div class="row">
            <div class="cell"><span class="label">Atividade Principal:</span> ${(data.dadosOperacionais && data.dadosOperacionais.oQueEmpresaFara) || '-'}</div>
            <div class="cell"><span class="label">Atendimento:</span> ${(data.dadosOperacionais && data.dadosOperacionais.tipoOperacao) || '-'}</div>
          </div>
          <div class="row">
            <div class="cell"><span class="label">Modo de Execução:</span> ${(data.dadosOperacionais && data.dadosOperacionais.modoExecucao) || '-'}</div>
            <div class="cell"><span class="label">Estoque no Local:</span> ${(data.dadosOperacionais && data.dadosOperacionais.estoqueLocal) || '-'}</div>
          </div>
          <div class="row">
            <div class="cell"><span class="label">Produtos/Mercadorias:</span> ${(data.dadosOperacionais && data.dadosOperacionais.quaisProdutos) || '-'}</div>
            <div class="cell"><span class="label">Serviços Prestados:</span> ${(data.dadosOperacionais && data.dadosOperacionais.quaisServicos) || '-'}</div>
          </div>
        </div>

        <div class="section-title">3. ENDEREÇO & NOMES PREFERENCIAIS</div>
        <div class="grid">
          <div class="row">
            <div class="cell"><span class="label">1ª Opção Razão Social:</span> ${(data.dadosNomes && data.dadosNomes.razaoOpcao1) || '-'}</div>
            <div class="cell"><span class="label">2ª Opção Razão Social:</span> ${(data.dadosNomes && data.dadosNomes.razaoOpcao2) || '-'}</div>
          </div>
          <div class="row">
            <div class="cell"><span class="label">Nome Fantasia:</span> ${(data.dadosNomes && data.dadosNomes.nomeFantasia) || '-'}</div>
            <div class="cell"><span class="label">Inscrição IPTU:</span> ${(data.enderecoEmpresa && data.enderecoEmpresa.inscricaoIptu) || '-'}</div>
          </div>
          <div class="row">
            <div class="cell" style="width: 100%; display: table-cell;" colspan="2">
              <span class="label">Endereço da Sede:</span> ${(data.enderecoEmpresa && data.enderecoEmpresa.logradouro) || ''}, ${(data.enderecoEmpresa && data.enderecoEmpresa.bairro) || ''} - ${(data.enderecoEmpresa && data.enderecoEmpresa.municipioUf) || ''} (CEP: ${(data.enderecoEmpresa && data.enderecoEmpresa.cep) || ''})
            </div>
          </div>
        </div>

        <div class="section-title">4. ESTIMATIVAS INICIAIS</div>
        <div class="grid">
          <div class="row">
            <div class="cell"><span class="label">Capital Social Estimado:</span> R$ ${(data.estimativaInicial && data.estimativaInicial.capitalSocial || 10000).toLocaleString('pt-BR')}</div>
            <div class="cell"><span class="label">Faturamento Mensal Previsto:</span> R$ ${(data.estimativaInicial && data.estimativaInicial.faturamentoMensalPrevisto || '-')}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    // -------------------------------------------------------------------------
    // 3. Salva o PDF do Formulário no Google Drive
    // -------------------------------------------------------------------------
    var blob = Utilities.newBlob(html, "text/html", fileName + ".html");
    var pdfFile = folder.createFile(blob.getAs("application/pdf")).setName(fileName + ".pdf");

    // -------------------------------------------------------------------------
    // 4. Salva TODOS os arquivos anexados (CNH, Comprovante, IPTU) na mesma pasta!
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
          var createdFile = folder.createFile(fileBlob);
          anexosCriados.push(createdFile.getName());
        } catch (docErr) {
          Logger.log("Erro ao salvar anexo: " + docErr.toString());
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      message: "Ficha PDF e todos os documentos anexados foram salvos no Google Drive com sucesso!",
      fileName: pdfFile.getName(),
      anexosContagem: anexosCriados.length,
      folderName: folder.getName()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Erro geral: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function extrairFolderId(input) {
  if (!input) return "";
  var match = input.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  return input.trim();
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

## Passo 4: Colar a URL no Formulário do Site

1. Cole essa URL gerada no campo **"URL do Webhook do Google Apps Script"** no Passo 4 do formulário do seu site.
2. Clique em **"Testar"**. O formulário salvará essa URL no navegador e, a partir de agora, **toda solicitação e documentos anexados pelos seus clientes irão diretamente para a sua pasta do Google Drive**!

