# Guia de Configuração - PDF do Dossiê & Anexos no Google Drive

Este guia explica como salvar **o Dossiê Contábil em PDF** e **TODOS os documentos anexados (IPTU, RG/CNH, Comprovante de Residência, Certidão de Casamento, IRPF, etc.)** diretamente dentro da sua pasta do Google Drive!

---

## Código do Google Apps Script (`Código.gs`)

Substitua todo o conteúdo do `Código.gs` no seu Google Apps Script pelo código abaixo:

```javascript
function doGet(e) {
  if (e && e.parameter && e.parameter.test === "1") {
    return salvarNoDrive({
      teste: true,
      razaoSocial: "Empresa Exemplo LTDA",
      nomeFantasia: "Exemplo Tech",
      ramoAtividade: "Prestação de Serviços",
      naturezaJuridica: "Sociedade Limitada Unipessoal (SLU)",
      porteEmpresa: "ME",
      formaAtuacao: "Internet / Digital",
      inscricaoIPTU: "01.02.034.0567",
      enderecoCompleto: "Av. Paulista, 1000, São Paulo/SP",
      simulacaoTributaria: {
        faturamentoMensalEstimado: 20000,
        regimeSugerido: "Simples Nacional (Anexo III)",
        impostoMensalEstimado: "R$ 1.200,00"
      },
      socios: [
        { nome: "João da Silva", nomeMae: "Maria da Silva", cpf: "111.222.333-44", rg: "12.345.678-9 SSP/SP", dataNascimento: "1990-05-15", naturalidade: "São Paulo/SP", estadoCivil: "Solteiro(a)", profissao: "Empresário", tituloEleitorOuIrpf: "1234567890", whatsapp: "(11) 99999-8888", email: "joao@email.com", percentualCapital: 100 }
      ]
    });
  }
  return ContentService.createTextOutput("O Webhook de Abertura de Empresa está ativo! Acesse com ?test=1 no final para criar um PDF de teste no Drive.")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  var data = {};
  try {
    var contents = e.postData ? e.postData.contents : "";
    data = contents ? JSON.parse(contents) : {};
  } catch (err) {
    data = { aviso: "Erro ao interpretar dados" };
  }
  return salvarNoDrive(data);
}

function salvarNoDrive(data) {
  try {
    // 1. COLE AQUI O LINK DA SUA PASTA DO GOOGLE DRIVE OU APENAS O ID:
    var PASTA_INPUT = "COLE_O_LINK_OU_ID_DA_SUA_PASTA_AQUI"; 
    
    var folderId = extrairFolderId(PASTA_INPUT);
    var folder;
    
    try {
      if (folderId) {
        folder = DriveApp.getFolderById(folderId);
      } else {
        folder = DriveApp.getRootFolder();
      }
    } catch (fErr) {
      folder = DriveApp.getRootFolder();
    }

    var empresaNome = data.razaoSocial || "Empresa_Nova";
    var fileName = "Dossie_Abertura_" + empresaNome.replace(/[^a-zA-Z0-9]/g, "_");

    // 2. Monta o Dossiê em PDF
    var html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; padding: 25px; line-height: 1.4; }
          .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
          .title { color: #1e3a8a; font-size: 20px; font-weight: bold; margin: 0; }
          .subtitle { color: #64748b; font-size: 12px; margin-top: 4px; }
          .section-title { background: #f1f5f9; color: #1e3a8a; padding: 6px 10px; font-size: 13px; font-weight: bold; border-left: 4px solid #2563eb; margin-top: 18px; }
          .grid { display: table; width: 100%; margin-top: 8px; }
          .row { display: table-row; }
          .cell { display: table-cell; padding: 5px 8px; font-size: 11px; width: 50%; }
          .label { font-weight: bold; color: #334155; }
          .highlight-box { background: #ecfdf5; border: 1px solid #10b981; padding: 10px; border-radius: 6px; margin-top: 8px; }
          .partner-card { border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; margin-top: 8px; font-size: 11px; background: #fafafa; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">DOSSIÊ DE ABERTURA DE EMPRESA</div>
          <div class="subtitle">Relatório Contábil Completo para REDESIM & Junta Comercial</div>
        </div>

        <div class="section-title">1. DADOS GERAIS DA EMPRESA</div>
        <div class="grid">
          <div class="row">
            <div class="cell"><span class="label">1ª Opção Razão Social:</span> ${data.razaoSocialOpcao1 || data.razaoSocial || '-'}</div>
            <div class="cell"><span class="label">Nome Fantasia:</span> ${data.nomeFantasia || '-'}</div>
          </div>
          <div class="row">
            <div class="cell"><span class="label">2ª Opção Razão Social:</span> ${data.razaoSocialOpcao2 || '-'}</div>
            <div class="cell"><span class="label">3ª Opção Razão Social:</span> ${data.razaoSocialOpcao3 || '-'}</div>
          </div>
          <div class="row">
            <div class="cell"><span class="label">Ramo de Atividade:</span> ${data.ramoAtividade || '-'}</div>
            <div class="cell"><span class="label">Natureza Jurídica:</span> ${data.naturezaJuridica || '-'}</div>
          </div>
          <div class="row">
            <div class="cell"><span class="label">Capital Social Total:</span> R$ ${(data.capitalSocialTotal || 10000).toLocaleString('pt-BR')}</div>
            <div class="cell"><span class="label">Forma Integralização:</span> ${data.formaIntegralizacao || '-'}</div>
          </div>
          <div class="row">
            <div class="cell"><span class="label">Porte da Empresa:</span> ${data.porteEmpresa || '-'}</div>
            <div class="cell"><span class="label">Previsão Pró-Labore:</span> ${data.proLaboreEstimado || '-'}</div>
          </div>
        </div>

        <div class="section-title">2. DIAGNÓSTICO TRIBUTÁRIO & FATURAMENTO</div>
        <div class="highlight-box">
          <div style="font-size: 12px;"><b>Faturamento Mensal Estimado:</b> R$ ${(data.simulacaoTributaria?.faturamentoMensalEstimado || 0).toLocaleString('pt-BR')}</div>
          <div style="font-size: 12px;"><b>Regime Sugerido:</b> ${data.simulacaoTributaria?.regimeSugerido || '-'}</div>
          <div style="font-size: 12px;"><b>Imposto Mensal Estimado:</b> ${data.simulacaoTributaria?.impostoMensalEstimado || '-'}</div>
        </div>

        <div class="section-title">3. SEDE, ZONEAMENTO (IPTU) & LICENCIAMENTO</div>
        <div class="grid">
          <div class="row">
            <div class="cell"><span class="label">Inscrição IPTU:</span> ${data.inscricaoIPTU || '-'}</div>
            <div class="cell"><span class="label">Tipo do Imóvel:</span> ${data.tipoImovelSede || '-'}</div>
          </div>
          <div class="row">
            <div class="cell"><span class="label">Metragem Sede (m²):</span> ${data.metragemImovel || '-'}</div>
            <div class="cell"><span class="label">Forma de Atuação:</span> ${data.formaAtuacao || '-'}</div>
          </div>
          <div class="row">
            <div class="cell"><span class="label">Atendimento ao Público:</span> ${data.atendimentoPublico || '-'}</div>
            <div class="cell"><span class="label">Estocagem / Inflamáveis:</span> ${data.estocagemProdutos || '-'}</div>
          </div>
          <div class="row">
            <div class="cell" style="width: 100%; display: table-cell;" colspan="2"><span class="label">Endereço Completo:</span> ${data.enderecoCompleto || '-'}</div>
          </div>
        </div>

        <div class="section-title">4. DADOS COMPLETO DOS SÓCIOS</div>
        ${(data.socios || []).map(function(s, i) {
          return '<div class="partner-card">' +
                 '<b>Sócio ' + (i+1) + ':</b> ' + (s.nome || '-') + ' | <b>CPF:</b> ' + (s.cpf || '-') + ' | <b>RG:</b> ' + (s.rg || '-') + '<br>' +
                 '<b>Nome da Mãe:</b> ' + (s.nomeMae || '-') + '<br>' +
                 '<b>Data Nasc:</b> ' + (s.dataNascimento || '-') + ' | <b>Naturalidade:</b> ' + (s.naturalidade || '-') + ' | <b>Estado Civil:</b> ' + (s.estadoCivil || '-') + '<br>' +
                 '<b>Profissão:</b> ' + (s.profissao || '-') + ' | <b>Título/IRPF:</b> ' + (s.tituloEleitorOuIrpf || '-') + '<br>' +
                 '<b>WhatsApp:</b> ' + (s.whatsapp || '-') + ' | <b>E-mail:</b> ' + (s.email || '-') + '<br>' +
                 '<b>Participação:</b> ' + (s.percentualCapital || 0) + '% do capital social' +
                 (s.impedimentos && s.impedimentos.length ? '<br><span style="color:red;">⚠️ Impedimentos: ' + s.impedimentos.join(', ') + '</span>' : '') +
                 '</div>';
        }).join('')}

      </body>
      </html>
    `;

    // 3. Salva o Dossiê em PDF no Google Drive
    var blob = Utilities.newBlob(html, "text/html", fileName + ".html");
    var pdfFile = folder.createFile(blob.getAs("application/pdf")).setName(fileName + ".pdf");

    // 4. Salva TODOS os arquivos PDF anexados na mesma pasta!
    var anexosCriados = [];
    if (data.documentosAnexadosFiles && data.documentosAnexadosFiles.length > 0) {
      for (var i = 0; i < data.documentosAnexadosFiles.length; i++) {
        var doc = data.documentosAnexadosFiles[i];
        if (doc.base64) {
          try {
            var fileBlob = Utilities.newBlob(Utilities.base64Decode(doc.base64), doc.fileType || "application/pdf", doc.fileName || ("Anexo_" + (i+1) + ".pdf"));
            var createdAnexo = folder.createFile(fileBlob);
            anexosCriados.push(createdAnexo.getName());
          } catch (docErr) {
            Logger.log("Erro ao salvar anexo: " + docErr.toString());
          }
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      message: "Dossiê PDF e Anexos salvos no Google Drive com sucesso!",
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

// Extrai o ID da pasta mesmo se o usuário colar a URL do navegador
function extrairFolderId(input) {
  if (!input) return "";
  var match = input.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  return input.trim();
}
```

---

### ⚠️ Lembre-se:
Após salvar o código no Google Apps Script, publique a **Nova Versão**:
**Implantar > Gerenciar Implantações > Lápis ✏️ > Nova versão > Implantar**.

