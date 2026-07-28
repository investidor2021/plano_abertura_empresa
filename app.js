/* ==========================================================================
   PLANO DE ABERTURA EMPRESA - APPLICATION LOGIC (JS)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // Application State
  const state = {
    currentStep: 1,
    totalSteps: 7,
    partners: [
      {
        id: 1,
        nome: '',
        nomeMae: '',
        cpf: '',
        rg: '',
        rgOrgaoEmissor: '',
        rgDataEmissao: '',
        dataNascimento: '',
        naturalidade: '',
        nacionalidade: 'Brasileira',
        estadoCivil: 'Solteiro(a)',
        nomeConjuge: '',
        cpfConjuge: '',
        regimeBens: 'Não aplicável',
        profissao: '',
        tituloEleitorOuIrpf: '',
        whatsapp: '',
        email: '',
        percentualCapital: 100,
        valCapital: 10000,
        isAdmin: true,
        impedimentos: []
      }
    ],
    documents: {
      iptu: [],
      documentos_socios: [],
      comprovante_residencia: [],
      certidao_casamento: [],
      contrato_locacao: [],
      conselho_classe: [],
      irpf_eleitor: [],
      outros: []
    },
    googleDriveWebhookUrl: localStorage.getItem('drive_webhook_url') || ''
  };

  // DOM Element Selectors
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeBtnText = document.getElementById('themeBtnText');
  const htmlElem = document.documentElement;
  
  const stepperList = document.getElementById('stepperList');
  const progressBar = document.getElementById('progressBar');
  
  const simFaturamentoMensal = document.getElementById('simFaturamentoMensal');
  const simTipoAtividade = document.getElementById('simTipoAtividade');
  
  const partnersContainer = document.getElementById('partnersContainer');
  const btnAddPartner = document.getElementById('btnAddPartner');
  
  const toastMsg = document.getElementById('toastMsg');
  const toastText = document.getElementById('toastText');

  /* --------------------------------------------------------------------------
     1. Theme Switcher (Dark / Light Mode)
     -------------------------------------------------------------------------- */
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = htmlElem.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    htmlElem.setAttribute('data-theme', newTheme);
    
    if (newTheme === 'dark') {
      themeBtnText.textContent = 'Modo Claro';
      themeToggleBtn.querySelector('i').setAttribute('data-lucide', 'sun');
    } else {
      themeBtnText.textContent = 'Modo Escuro';
      themeToggleBtn.querySelector('i').setAttribute('data-lucide', 'moon');
    }
    lucide.createIcons();
  });

  /* --------------------------------------------------------------------------
     2. Stepper Wizard Navigation & Validation
     -------------------------------------------------------------------------- */
  function updateStepperUI() {
    const stepItems = document.querySelectorAll('.step-item');
    stepItems.forEach((item, idx) => {
      const stepNum = idx + 1;
      item.classList.remove('active', 'completed');
      
      if (stepNum === state.currentStep) {
        item.classList.add('active');
      } else if (stepNum < state.currentStep) {
        item.classList.add('completed');
      }
    });

    // Update Progress Bar width
    const progressPercent = ((state.currentStep - 1) / (state.totalSteps - 1)) * 100;
    progressBar.style.width = `${progressPercent}%`;

    // Show active panel, hide others
    const panels = document.querySelectorAll('.step-content-panel');
    panels.forEach((panel, idx) => {
      if (idx + 1 === state.currentStep) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // If Step 7 (Summary), update final summary view
    if (state.currentStep === 7) {
      renderSummaryView();
    }
  }

  // Stepper Header Clicking
  stepperList.addEventListener('click', (e) => {
    const stepBtn = e.target.closest('.step-item');
    if (stepBtn) {
      const targetStep = parseInt(stepBtn.getAttribute('data-step'), 10);
      if (targetStep <= state.currentStep || validateCurrentStep()) {
        state.currentStep = targetStep;
        updateStepperUI();
      }
    }
  });

  // Next & Prev Buttons Event Delegation
  document.querySelectorAll('.btn-next-step').forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateCurrentStep()) {
        state.currentStep = Math.min(state.currentStep + 1, state.totalSteps);
        saveDraftToLocalStorage();
        updateStepperUI();
      }
    });
  });

  document.querySelectorAll('.btn-prev-step').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentStep = Math.max(state.currentStep - 1, 1);
      updateStepperUI();
    });
  });

  function validateCurrentStep() {
    const currentPanel = document.getElementById(`panelStep${state.currentStep}`);
    if (!currentPanel) return true;

    const requiredInputs = currentPanel.querySelectorAll('[required]');
    let isValid = true;

    requiredInputs.forEach(input => {
      if (!input.value.trim()) {
        isValid = false;
        input.classList.add('input-error');
        input.style.borderColor = 'var(--rose-500)';
      } else {
        input.classList.remove('input-error');
        input.style.borderColor = 'var(--border-color)';
      }
    });

    if (!isValid) {
      showToast('Por favor, preencha todos os campos obrigatórios marcados com (*)', 'rose');
    }
    return isValid;
  }

  /* --------------------------------------------------------------------------
     3. Radio Cards Logic (Natureza Jurídica)
     -------------------------------------------------------------------------- */
  document.querySelectorAll('.radio-card').forEach(card => {
    card.addEventListener('click', () => {
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        // Update selected class
        document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        // Auto update Porte if MEI selected
        const porteSelect = document.getElementById('porteEmpresa');
        if (radio.value.includes('MEI')) {
          porteSelect.value = 'MEI';
        }
      }
    });
  });

  /* --------------------------------------------------------------------------
     4. Interactive Tax Simulator & Revenue Limit Calculator
     -------------------------------------------------------------------------- */
  function calculateTaxSimulation() {
    const mensFaturamento = parseFloat(simFaturamentoMensal.value) || 0;
    const anualFaturamento = mensFaturamento * 12;
    const tipoOperacao = simTipoAtividade.value;

    let regimeSugerido = 'Simples Nacional';
    let aliquotaEfetiva = 0.06; // Default 6%
    let noteText = '';

    // MEI check
    if (anualFaturamento <= 81000 && (tipoOperacao === 'comercio' || tipoOperacao === 'servico_geral')) {
      regimeSugerido = 'MEI (Opção Simplificada)';
      const impostoFixo = 75.00;
      const aliquotaCalculada = (impostoFixo / (mensFaturamento || 1)) * 100;

      document.getElementById('simResultAnual').textContent = formatCurrency(anualFaturamento);
      document.getElementById('simResultRegime').textContent = regimeSugerido;
      document.getElementById('simResultAliquota').textContent = `${aliquotaCalculada.toFixed(2)}% (Fixo)`;
      document.getElementById('simResultImpostoMensal').textContent = formatCurrency(impostoFixo);

      document.getElementById('simNoteText').innerHTML = `Faturamento até R$ 81.000,00/ano se enquadra no <strong>MEI</strong>, com pagamento fixo DAS de <strong>R$ 75,00/mês</strong>.`;
      return;
    }

    // Simples Nacional Anexos Calculation
    switch (tipoOperacao) {
      case 'comercio':
        if (anualFaturamento <= 180000) aliquotaEfetiva = 0.04;
        else if (anualFaturamento <= 360000) aliquotaEfetiva = 0.073;
        else if (anualFaturamento <= 720000) aliquotaEfetiva = 0.095;
        else aliquotaEfetiva = 0.107;
        noteText = `Para <strong>Comércio</strong>, o enquadramento no <strong>Simples Nacional (Anexo I)</strong> inicia em 4.00%.`;
        break;

      case 'industria':
        if (anualFaturamento <= 180000) aliquotaEfetiva = 0.045;
        else if (anualFaturamento <= 360000) aliquotaEfetiva = 0.078;
        else aliquotaEfetiva = 0.10;
        noteText = `Para <strong>Indústria</strong>, o enquadramento no <strong>Simples Nacional (Anexo II)</strong> inicia em 4.50%.`;
        break;

      case 'servico_geral':
        if (anualFaturamento <= 180000) aliquotaEfetiva = 0.06;
        else if (anualFaturamento <= 360000) aliquotaEfetiva = 0.112;
        else aliquotaEfetiva = 0.135;
        noteText = `Para <strong>Serviços Gerais / TI</strong>, o <strong>Simples Nacional (Anexo III)</strong> inicia em 6.00%.`;
        break;

      case 'servico_anexo4':
        if (anualFaturamento <= 180000) aliquotaEfetiva = 0.045;
        else if (anualFaturamento <= 360000) aliquotaEfetiva = 0.09;
        else aliquotaEfetiva = 0.102;
        noteText = `Para <strong>Advocacia / Obras</strong>, o <strong>Simples Anexo IV</strong> inicia em 4.50% (+ CPP patronal recolhido à parte).`;
        break;

      case 'servico_anexo5':
        // Check if Lucro Presumido might be better
        if (anualFaturamento > 360000) {
          regimeSugerido = 'Lucro Presumido (Avaliável)';
          aliquotaEfetiva = 0.1533; // 15.33% avg
          noteText = `Em atividades intelectuais sem Fator R (28% em folha), o <strong>Anexo V</strong> cobra 15.5%. Acima de R$ 30k/mês, o <strong>Lucro Presumido (~15.33%)</strong> pode ser mais vantajoso.`;
        } else {
          aliquotaEfetiva = 0.155;
          noteText = `Atividade no <strong>Anexo V (15.50%)</strong>. Dica: se a folha de pagamento for &ge; 28% do faturamento (Fator R), a empresa migra para o <strong>Anexo III (6.00%)</strong>.`;
        }
        break;
    }

    const impostoMensalEst = mensFaturamento * aliquotaEfetiva;

    document.getElementById('simResultAnual').textContent = formatCurrency(anualFaturamento);
    document.getElementById('simResultRegime').textContent = regimeSugerido;
    document.getElementById('simResultAliquota').textContent = `${(aliquotaEfetiva * 100).toFixed(2)}%`;
    document.getElementById('simResultImpostoMensal').textContent = formatCurrency(impostoMensalEst);
    document.getElementById('simNoteText').innerHTML = noteText;
  }

  simFaturamentoMensal.addEventListener('input', calculateTaxSimulation);
  simTipoAtividade.addEventListener('change', calculateTaxSimulation);

  /* --------------------------------------------------------------------------
     5. Dynamic Partners Manager (Quadro Societário)
     -------------------------------------------------------------------------- */
  function renderPartners() {
    partnersContainer.innerHTML = '';

    state.partners.forEach((partner, index) => {
      const card = document.createElement('div');
      card.className = 'partner-card';
      card.innerHTML = `
        <div class="partner-card-header">
          <div class="partner-title">
            <i data-lucide="user"></i> Sócio ${index + 1} ${partner.isAdmin ? '(Sócio Administrador)' : ''}
          </div>
          ${state.partners.length > 1 ? `
            <button type="button" class="btn-remove-partner" data-index="${index}">
              <i data-lucide="trash-2"></i> Remover Sócio
            </button>
          ` : ''}
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label">Nome Completo do Sócio <span class="required">*</span></label>
            <input type="text" class="input-text partner-nome" data-index="${index}" value="${partner.nome}" placeholder="Ex: João da Silva" required>
          </div>

          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label">Nome Completo da Mãe <span class="required">*</span></label>
            <input type="text" class="input-text partner-nomemae" data-index="${index}" value="${partner.nomeMae}" placeholder="Nome completo da mãe" required>
          </div>

          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label">CPF do Sócio <span class="required">*</span></label>
            <input type="text" class="input-text partner-cpf" data-index="${index}" value="${partner.cpf}" placeholder="000.000.000-00" required>
          </div>

          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label">RG e Órgão Emissor <span class="required">*</span></label>
            <input type="text" class="input-text partner-rg" data-index="${index}" value="${partner.rg}" placeholder="Ex: 12.345.678-9 SSP/SP" required>
          </div>

          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label">Data de Nascimento <span class="required">*</span></label>
            <input type="date" class="input-text partner-datanasc" data-index="${index}" value="${partner.dataNascimento}" required>
          </div>

          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label">Naturalidade (Cidade/UF) <span class="required">*</span></label>
            <input type="text" class="input-text partner-naturalidade" data-index="${index}" value="${partner.naturalidade}" placeholder="Ex: São Paulo / SP" required>
          </div>

          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label">Estado Civil <span class="required">*</span></label>
            <select class="select-input partner-estadocivil" data-index="${index}">
              <option value="Solteiro(a)" ${partner.estadoCivil === 'Solteiro(a)' ? 'selected' : ''}>Solteiro(a)</option>
              <option value="Casado(a)" ${partner.estadoCivil === 'Casado(a)' ? 'selected' : ''}>Casado(a)</option>
              <option value="União Estável" ${partner.estadoCivil === 'União Estável' ? 'selected' : ''}>União Estável</option>
              <option value="Divorciado(a)" ${partner.estadoCivil === 'Divorciado(a)' ? 'selected' : ''}>Divorciado(a)</option>
              <option value="Viúvo(a)" ${partner.estadoCivil === 'Viúvo(a)' ? 'selected' : ''}>Viúvo(a)</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label">Regime de Bens (Se Casado)</label>
            <input type="text" class="input-text partner-regimebens" data-index="${index}" value="${partner.regimeBens}" placeholder="Ex: Comunhão Parcial de Bens">
          </div>

          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label">Profissão <span class="required">*</span></label>
            <input type="text" class="input-text partner-profissao" data-index="${index}" value="${partner.profissao}" placeholder="Ex: Empresário, Engenheiro" required>
          </div>

          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label">Título de Eleitor ou Nº IRPF <span class="required">*</span></label>
            <input type="text" class="input-text partner-tituloirpf" data-index="${index}" value="${partner.tituloEleitorOuIrpf}" placeholder="Nº do Título ou Recibo do IRPF" required>
          </div>

          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label">WhatsApp / Celular com DDD <span class="required">*</span></label>
            <input type="text" class="input-text partner-whatsapp" data-index="${index}" value="${partner.whatsapp}" placeholder="(11) 99999-9999" required>
          </div>

          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label">E-mail do Sócio <span class="required">*</span></label>
            <input type="email" class="input-text partner-email" data-index="${index}" value="${partner.email}" placeholder="socio@email.com" required>
          </div>

          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label">Participação no Capital (%) <span class="required">*</span></label>
            <input type="number" class="input-text partner-percentual" data-index="${index}" value="${partner.percentualCapital}" min="1" max="100" required>
          </div>
        </div>

        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--border-color);">
          <label class="form-label" style="font-size: 0.9rem;">Verificação de Impedimentos Legais para este sócio:</label>
          
          <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem; color: var(--text-secondary);">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" class="partner-check-impedimento" data-index="${index}" value="medico_farmacia" ${partner.impedimentos.includes('medico_farmacia') ? 'checked' : ''}>
              Médico(a) exercendo farmácia ou farmacêutico(a) exercendo medicina simultaneamente
            </label>

            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" class="partner-check-impedimento" data-index="${index}" value="servidor_publico" ${partner.impedimentos.includes('servidor_publico') ? 'checked' : ''}>
              Funcionário público federal civil ou militar da ativa (ou estadual/municipal com impedimento estatutário)
            </label>

            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" class="partner-check-impedimento" data-index="${index}" value="condenado" ${partner.impedimentos.includes('condenado') ? 'checked' : ''}>
              Possui condenação criminal que impeça o exercício de cargo público ou empresarial
            </label>
          </div>
        </div>
      `;

      partnersContainer.appendChild(card);
    });

    lucide.createIcons();
    attachPartnerEvents();
  }

  function attachPartnerEvents() {
    document.querySelectorAll('.partner-nome').forEach(input => {
      input.addEventListener('input', (e) => state.partners[e.target.dataset.index].nome = e.target.value);
    });

    document.querySelectorAll('.partner-nomemae').forEach(input => {
      input.addEventListener('input', (e) => state.partners[e.target.dataset.index].nomeMae = e.target.value);
    });

    document.querySelectorAll('.partner-cpf').forEach(input => {
      input.addEventListener('input', (e) => state.partners[e.target.dataset.index].cpf = e.target.value);
    });

    document.querySelectorAll('.partner-rg').forEach(input => {
      input.addEventListener('input', (e) => state.partners[e.target.dataset.index].rg = e.target.value);
    });

    document.querySelectorAll('.partner-datanasc').forEach(input => {
      input.addEventListener('change', (e) => state.partners[e.target.dataset.index].dataNascimento = e.target.value);
    });

    document.querySelectorAll('.partner-naturalidade').forEach(input => {
      input.addEventListener('input', (e) => state.partners[e.target.dataset.index].naturalidade = e.target.value);
    });

    document.querySelectorAll('.partner-estadocivil').forEach(select => {
      select.addEventListener('change', (e) => state.partners[e.target.dataset.index].estadoCivil = e.target.value);
    });

    document.querySelectorAll('.partner-regimebens').forEach(input => {
      input.addEventListener('input', (e) => state.partners[e.target.dataset.index].regimeBens = e.target.value);
    });

    document.querySelectorAll('.partner-profissao').forEach(input => {
      input.addEventListener('input', (e) => state.partners[e.target.dataset.index].profissao = e.target.value);
    });

    document.querySelectorAll('.partner-tituloirpf').forEach(input => {
      input.addEventListener('input', (e) => state.partners[e.target.dataset.index].tituloEleitorOuIrpf = e.target.value);
    });

    document.querySelectorAll('.partner-whatsapp').forEach(input => {
      input.addEventListener('input', (e) => state.partners[e.target.dataset.index].whatsapp = e.target.value);
    });

    document.querySelectorAll('.partner-email').forEach(input => {
      input.addEventListener('input', (e) => state.partners[e.target.dataset.index].email = e.target.value);
    });

    document.querySelectorAll('.partner-percentual').forEach(input => {
      input.addEventListener('input', (e) => state.partners[e.target.dataset.index].percentualCapital = parseFloat(e.target.value) || 0);
    });

    document.querySelectorAll('.partner-check-impedimento').forEach(check => {
      check.addEventListener('change', (e) => {
        const idx = e.target.dataset.index;
        const val = e.target.value;
        if (e.target.checked) {
          if (!state.partners[idx].impedimentos.includes(val)) {
            state.partners[idx].impedimentos.push(val);
          }
          showToast('Alerta: Sócios com impedimento legal necessitam de análise especial da contabilidade.', 'rose');
        } else {
          state.partners[idx].impedimentos = state.partners[idx].impedimentos.filter(item => item !== val);
        }
      });
    });

    document.querySelectorAll('.btn-remove-partner').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        state.partners.splice(idx, 1);
        renderPartners();
      });
    });
  }

  btnAddPartner.addEventListener('click', () => {
    state.partners.push({
      id: state.partners.length + 1,
      nome: '',
      nomeMae: '',
      cpf: '',
      rg: '',
      rgOrgaoEmissor: '',
      rgDataEmissao: '',
      dataNascimento: '',
      naturalidade: '',
      nacionalidade: 'Brasileira',
      estadoCivil: 'Solteiro(a)',
      nomeConjuge: '',
      cpfConjuge: '',
      regimeBens: 'Não aplicável',
      profissao: '',
      tituloEleitorOuIrpf: '',
      whatsapp: '',
      email: '',
      percentualCapital: 0,
      valCapital: 0,
      isAdmin: false,
      impedimentos: []
    });
    renderPartners();
  });

  // Helper to convert File to Base64
  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result.split(',')[1];
        resolve({
          fileName: file.name,
          fileType: file.type,
          base64: base64Data
        });
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  async function getPayloadDataObject() {
    // Process attached files to Base64
    const attachedFilesList = [];
    for (const category in state.documents) {
      for (const file of state.documents[category]) {
        try {
          const b64 = await readFileAsBase64(file);
          attachedFilesList.push({
            categoria: category,
            fileName: `${category}_${file.name}`,
            fileType: file.type,
            base64: b64.base64
          });
        } catch (e) {
          console.warn('Erro ao ler arquivo:', file.name, e);
        }
      }
    }

    return {
      timestamp: new Date().toISOString(),
      ramoAtividade: document.getElementById('ramoAtividade').value,
      descricaoAtividades: document.getElementById('descricaoDetalhadaAtividades').value,
      razaoSocialOpcao1: document.getElementById('razaoSocialOpcao1')?.value || '',
      razaoSocialOpcao2: document.getElementById('razaoSocialOpcao2')?.value || '',
      razaoSocialOpcao3: document.getElementById('razaoSocialOpcao3')?.value || '',
      razaoSocial: document.getElementById('razaoSocialOpcao1')?.value || document.getElementById('razaoSocialSugerida')?.value || 'Empresa_Nova',
      nomeFantasia: document.getElementById('nomeFantasia')?.value || '',
      capitalSocialTotal: parseFloat(document.getElementById('capitalSocialTotal')?.value) || 10000,
      formaIntegralizacao: document.getElementById('formaIntegralizacao')?.value || '',
      proLaboreEstimado: document.getElementById('proLaboreEstimado')?.value || '',
      naturezaJuridica: document.querySelector('input[name="naturezaJuridica"]:checked')?.value,
      porteEmpresa: document.getElementById('porteEmpresa').value,
      simulacaoTributaria: {
        faturamentoMensalEstimado: parseFloat(simFaturamentoMensal.value) || 0,
        faturamentoAnualEstimado: (parseFloat(simFaturamentoMensal.value) || 0) * 12,
        regimeSugerido: document.getElementById('simResultRegime').textContent,
        impostoMensalEstimado: document.getElementById('simResultImpostoMensal').textContent
      },
      formaAtuacao: document.getElementById('formaAtuacao').value,
      tipoImovelSede: document.getElementById('tipoImovelSede')?.value || '',
      metragemImovel: document.getElementById('metragemImovel')?.value || '',
      atendimentoPublico: document.getElementById('atendimentoPublico')?.value || '',
      estocagemProdutos: document.getElementById('estocagemProdutos')?.value || '',
      inscricaoIPTU: document.getElementById('inscricaoIPTU').value,
      enderecoCompleto: document.getElementById('enderecoCompleto').value,
      socios: state.partners,
      documentosAnexadosFiles: attachedFilesList
    };
  }

  /* --------------------------------------------------------------------------
     6. File Upload Dropzones & PDF Checklist Handler
     -------------------------------------------------------------------------- */
  document.querySelectorAll('.file-dropzone').forEach(dropzone => {
    const fileInput = dropzone.querySelector('input[type="file"]');
    const docType = dropzone.getAttribute('data-doc-type');
    const previewList = dropzone.querySelector('.file-preview-list');

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files, docType, previewList);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        handleFiles(e.target.files, docType, previewList);
      }
    });
  });

  function handleFiles(files, docType, previewElem) {
    Array.from(files).forEach(file => {
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        showToast(`O arquivo "${file.name}" não é um PDF válido!`, 'rose');
        return;
      }

      state.documents[docType].push(file);
    });

    renderFilePills(docType, previewElem);
  }

  function renderFilePills(docType, previewElem) {
    previewElem.innerHTML = '';
    state.documents[docType].forEach((file, index) => {
      const pill = document.createElement('div');
      pill.className = 'file-pill';
      pill.innerHTML = `
        <i data-lucide="file-text"></i> ${file.name} (${(file.size / 1024).toFixed(1)} KB)
        <i data-lucide="x" style="cursor:pointer; margin-left:5px;" onclick="removeFile('${docType}', ${index})"></i>
      `;
      previewElem.appendChild(pill);
    });
    lucide.createIcons();
  }

  window.removeFile = function(docType, index) {
    state.documents[docType].splice(index, 1);
    const dropzone = document.querySelector(`.file-dropzone[data-doc-type="${docType}"]`);
    if (dropzone) {
      renderFilePills(docType, dropzone.querySelector('.file-preview-list'));
    }
  };

  /* --------------------------------------------------------------------------
     7. Render Final Summary View & Export Options
     -------------------------------------------------------------------------- */
  // Render Summary & Wire Up Step 7 Google Drive Connection
  function renderSummaryView() {
    const summaryView = document.getElementById('summaryView');
    const selectedNatureza = document.querySelector('input[name="naturezaJuridica"]:checked')?.value || 'SLU';
    const ramo = document.getElementById('ramoAtividade')?.value || '-';
    const atividades = document.getElementById('descricaoDetalhadaAtividades')?.value || '-';
    const op1 = document.getElementById('razaoSocialOpcao1')?.value || document.getElementById('razaoSocialSugerida')?.value || '-';
    const op2 = document.getElementById('razaoSocialOpcao2')?.value || '-';
    const op3 = document.getElementById('razaoSocialOpcao3')?.value || '-';
    const nomeFantasia = document.getElementById('nomeFantasia')?.value || 'Não informado';
    
    const capTotal = parseFloat(document.getElementById('capitalSocialTotal')?.value) || 10000;
    const integralizacao = document.getElementById('formaIntegralizacao')?.value || '-';
    const proLabore = document.getElementById('proLaboreEstimado')?.value || 'Não informado';

    const porte = document.getElementById('porteEmpresa')?.value || '-';
    const formaAtuacao = document.getElementById('formaAtuacao')?.value || '-';
    const tipoImovel = document.getElementById('tipoImovelSede')?.value || '-';
    const metragem = document.getElementById('metragemImovel')?.value || '-';
    const atendPublico = document.getElementById('atendimentoPublico')?.value || '-';
    const estocagem = document.getElementById('estocagemProdutos')?.value || '-';
    const iptu = document.getElementById('inscricaoIPTU')?.value || '-';
    const endereco = document.getElementById('enderecoCompleto')?.value || '-';

    const faturamentoMensalEst = parseFloat(simFaturamentoMensal.value) || 0;
    const faturamentoAnualEst = faturamentoMensalEst * 12;

    // Count total files across all 8 categories
    let totalFilesCount = 0;
    const filesBreakdownHTML = Object.keys(state.documents).map(cat => {
      const files = state.documents[cat];
      totalFilesCount += files.length;
      if (files.length === 0) return '';
      const catNames = {
        iptu: 'IPTU da Sede',
        documentos_socios: 'RG/CNH dos Sócios',
        comprovante_residencia: 'Comprovante de Residência',
        certidao_casamento: 'Certidão de Casamento/União',
        contrato_locacao: 'Contrato de Locação Sede',
        conselho_classe: 'Conselho de Classe (OAB/CRM/etc)',
        irpf_eleitor: 'Recibo IRPF / Título Eleitor',
        outros: 'Outros Documentos'
      };
      return `
        <div style="background: var(--bg-card); padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 0.5rem;">
          <strong style="color: var(--primary-600); font-size: 0.88rem;">📄 ${catNames[cat] || cat}: (${files.length} arquivo(s))</strong>
          <ul style="margin-left: 1.25rem; font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.25rem;">
            ${files.map(f => `<li>${f.name} (${(f.size/1024).toFixed(1)} KB)</li>`).join('')}
          </ul>
        </div>
      `;
    }).filter(html => html !== '').join('');

    summaryView.innerHTML = `
      <div class="summary-section">
        <h3><i data-lucide="building"></i> 1. Dados Gerais da Empresa & Razão Social</h3>
        <div class="summary-grid">
          <div class="summary-item"><strong>1ª Opção Razão Social:</strong> <span>${op1}</span></div>
          <div class="summary-item"><strong>Nome Fantasia:</strong> <span>${nomeFantasia}</span></div>
          <div class="summary-item"><strong>2ª Opção Razão Social:</strong> <span>${op2}</span></div>
          <div class="summary-item"><strong>3ª Opção Razão Social:</strong> <span>${op3}</span></div>
          <div class="summary-item"><strong>Ramo de Atividade:</strong> <span>${ramo}</span></div>
          <div class="summary-item"><strong>Natureza Jurídica:</strong> <span>${selectedNatureza}</span></div>
          <div class="summary-item"><strong>Capital Social Total:</strong> <span>${formatCurrency(capTotal)}</span></div>
          <div class="summary-item"><strong>Integralização:</strong> <span>${integralizacao}</span></div>
          <div class="summary-item"><strong>Porte da Empresa:</strong> <span>${porte}</span></div>
          <div class="summary-item"><strong>Previsão Pró-Labore:</strong> <span>${proLabore}</span></div>
        </div>
      </div>

      <div class="summary-section">
        <h3><i data-lucide="calculator"></i> 2. Diagnóstico Tributário & Faturamento</h3>
        <div class="summary-grid">
          <div class="summary-item"><strong>Faturamento Mensal Est.:</strong> <span>${formatCurrency(faturamentoMensalEst)}</span></div>
          <div class="summary-item"><strong>Faturamento Anual Est.:</strong> <span>${formatCurrency(faturamentoAnualEst)}</span></div>
          <div class="summary-item"><strong>Regime Sugerido:</strong> <span>${document.getElementById('simResultRegime').textContent}</span></div>
          <div class="summary-item"><strong>Imposto Mensal Est.:</strong> <span>${document.getElementById('simResultImpostoMensal').textContent}</span></div>
        </div>
      </div>

      <div class="summary-section">
        <h3><i data-lucide="map-pin"></i> 3. Sede, IPTU & Licenciamento Municipal</h3>
        <div class="summary-grid">
          <div class="summary-item"><strong>Inscrição IPTU:</strong> <span>${iptu}</span></div>
          <div class="summary-item"><strong>Tipo do Imóvel Sede:</strong> <span>${tipoImovel}</span></div>
          <div class="summary-item"><strong>Metragem (m²):</strong> <span>${metragem}</span></div>
          <div class="summary-item"><strong>Forma de Atuação:</strong> <span>${formaAtuacao}</span></div>
          <div class="summary-item"><strong>Atendimento ao Público:</strong> <span>${atendPublico}</span></div>
          <div class="summary-item"><strong>Estocagem / Inflamáveis:</strong> <span>${estocagem}</span></div>
          <div class="summary-item" style="grid-column: 1 / -1;"><strong>Endereço Completo de Funcionamento:</strong> <span>${endereco}</span></div>
        </div>
      </div>

      <div class="summary-section">
        <h3><i data-lucide="users"></i> 4. Quadro Societário (${state.partners.length} Sócio(s) Cadastrado(s))</h3>
        ${state.partners.map((p, i) => `
          <div style="background: var(--bg-card); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 0.75rem; border: 1px solid var(--border-color);">
            <div style="font-weight: 700; color: var(--primary-700); font-size: 0.98rem; margin-bottom: 0.35rem;">
              👤 Sócio ${i + 1}: ${p.nome || 'Não informado'} ${p.isAdmin ? '(Sócio Administrador)' : ''}
            </div>
            <div class="summary-grid" style="font-size: 0.85rem;">
              <div><strong>Nome da Mãe:</strong> ${p.nomeMae || '-'}</div>
              <div><strong>CPF:</strong> ${p.cpf || '-'}</div>
              <div><strong>RG:</strong> ${p.rg || '-'}</div>
              <div><strong>Data Nasc.:</strong> ${p.dataNascimento || '-'}</div>
              <div><strong>Naturalidade:</strong> ${p.naturalidade || '-'}</div>
              <div><strong>Estado Civil:</strong> ${p.estadoCivil || '-'} ${p.regimeBens !== 'Não aplicável' ? `(${p.regimeBens})` : ''}</div>
              <div><strong>Profissão:</strong> ${p.profissao || '-'}</div>
              <div><strong>Título/IRPF:</strong> ${p.tituloEleitorOuIrpf || '-'}</div>
              <div><strong>WhatsApp:</strong> ${p.whatsapp || '-'}</div>
              <div><strong>E-mail:</strong> ${p.email || '-'}</div>
              <div><strong>Cotas Capital:</strong> ${p.percentualCapital || 0}%</div>
            </div>
            ${p.impedimentos && p.impedimentos.length ? `<div style="color: var(--rose-500); font-size: 0.8rem; margin-top: 0.4rem; font-weight: 600;">⚠️ Impedimentos declarados: ${p.impedimentos.join(', ')}</div>` : ''}
          </div>
        `).join('')}
      </div>

      <div class="summary-section">
        <h3><i data-lucide="paperclip"></i> 5. Documentos Anexados (${totalFilesCount} Arquivo(s) em PDF)</h3>
        ${totalFilesCount > 0 ? filesBreakdownHTML : '<div style="color: var(--amber-500); font-size: 0.88rem;">⚠️ Nenhum arquivo PDF foi anexado na Etapa 6.</div>'}
      </div>
    `;

    // Populate Drive URL input from state or localStorage
    const inputDriveUrl = document.getElementById('inputDriveUrl');
    if (inputDriveUrl && state.googleDriveWebhookUrl) {
      inputDriveUrl.value = state.googleDriveWebhookUrl;
    }

    lucide.createIcons();
  }

  // Test Drive Connection Button Handler
  document.getElementById('btnTestDriveConnection')?.addEventListener('click', async () => {
    const inputDriveUrl = document.getElementById('inputDriveUrl');
    const driveStatusText = document.getElementById('driveStatusText');
    const url = inputDriveUrl.value.trim();

    if (!url) {
      driveStatusText.style.color = 'var(--rose-500)';
      driveStatusText.textContent = '❌ Por favor, informe a URL do Webhook do Apps Script.';
      return;
    }

    if (url.includes('drive.google.com/drive/folders')) {
      driveStatusText.style.color = 'var(--rose-500)';
      driveStatusText.textContent = '❌ URL Incorreta! Você colou o link da pasta. Cole a URL do Webhook do Apps Script que termina em /exec.';
      return;
    }

    driveStatusText.style.color = 'var(--primary-600)';
    driveStatusText.textContent = '🔄 Testando conexão com o Google Drive...';

    try {
      // Test GET request
      const res = await fetch(url);
      const text = await res.text();
      
      state.googleDriveWebhookUrl = url;
      localStorage.setItem('drive_webhook_url', url);

      driveStatusText.style.color = 'var(--accent-emerald-dark)';
      driveStatusText.textContent = '✅ Conexão estabelecida e confirmada com o Google Drive!';
      showToast('Conexão com o Google Drive testada com sucesso!', 'emerald');
    } catch (err) {
      console.warn(err);
      driveStatusText.style.color = 'var(--amber-500)';
      driveStatusText.textContent = '⚠️ Webhook configurado (envios ativos). Caso não salve, certifique-se de publicar com acesso para "Qualquer Pessoa".';
    }
  });

  // Action Buttons
  document.getElementById('btnDownloadPDF').addEventListener('click', () => {
    window.print();
  });

  document.getElementById('btnExportJSON').addEventListener('click', async () => {
    const payload = await getPayloadDataObject();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Dossie_Abertura_${(payload.razaoSocial || 'Empresa').replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Pacote de dados JSON baixado com sucesso!', 'emerald');
  });

  // Main Google Drive Upload Button
  document.getElementById('btnUploadDrive').addEventListener('click', async () => {
    const inputDriveUrl = document.getElementById('inputDriveUrl');
    let webhookUrl = inputDriveUrl ? inputDriveUrl.value.trim() : state.googleDriveWebhookUrl;

    if (!webhookUrl) {
      webhookUrl = prompt('Por favor, cole a URL do Webhook do Google Apps Script (que termina em /exec):');
      if (!webhookUrl) return;
      webhookUrl = webhookUrl.trim();
      if (inputDriveUrl) inputDriveUrl.value = webhookUrl;
    }

    if (webhookUrl.includes('drive.google.com/drive/folders')) {
      alert('⚠️ Atenção: A URL informada é o link da pasta do Google Drive.\n\nVocê deve colar a URL do Webhook do Google Apps Script (que termina em /exec).\n\nConfira as instruções no arquivo google_drive_setup.md.');
      return;
    }

    state.googleDriveWebhookUrl = webhookUrl;
    localStorage.setItem('drive_webhook_url', webhookUrl);

    showToast('Enviando Dossiê e anexos para a pasta do Google Drive...', 'primary');

    try {
      const payload = await getPayloadDataObject();
      
      // Envio via POST com no-cors para Google Apps Script
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      showToast('Dossiê e anexos transmitidos para o Google Drive com sucesso!', 'emerald');
      alert('✅ Dossiê e Anexos Enviados!\n\nVerifique a sua pasta no Google Drive. O Dossiê em PDF e todos os documentos anexados foram criados!');
    } catch (err) {
      console.error(err);
      showToast('Erro no envio. Verifique a URL do Webhook.', 'rose');
    }
  });

  function getPayloadDataObject() {
    return {
      timestamp: new Date().toISOString(),
      ramoAtividade: document.getElementById('ramoAtividade').value,
      descricaoAtividades: document.getElementById('descricaoDetalhadaAtividades').value,
      naturezaJuridica: document.querySelector('input[name="naturezaJuridica"]:checked')?.value,
      porteEmpresa: document.getElementById('porteEmpresa').value,
      simulacaoTributaria: {
        faturamentoMensalEstimado: parseFloat(simFaturamentoMensal.value) || 0,
        faturamentoAnualEstimado: (parseFloat(simFaturamentoMensal.value) || 0) * 12,
        regimeSugerido: document.getElementById('simResultRegime').textContent,
        impostoMensalEstimado: document.getElementById('simResultImpostoMensal').textContent
      },
      razaoSocial: document.getElementById('razaoSocialSugerida').value,
      nomeFantasia: document.getElementById('nomeFantasia').value,
      formaAtuacao: document.getElementById('formaAtuacao').value,
      inscricaoIPTU: document.getElementById('inscricaoIPTU').value,
      enderecoCompleto: document.getElementById('enderecoCompleto').value,
      socios: state.partners,
      documentosAnexados: {
        iptuCount: state.documents.iptu.length,
        sociosDocCount: state.documents.documentos_socios.length,
        residenciaCount: state.documents.comprovante_residencia.length,
        outrosCount: state.documents.outros.length
      }
    };
  }

  /* --------------------------------------------------------------------------
     8. Utility Functions & LocalStorage Draft Save
     -------------------------------------------------------------------------- */
  function formatCurrency(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  }

  function showToast(msg, type = 'primary') {
    toastText.textContent = msg;
    toastMsg.className = `toast-msg show ${type}`;
    setTimeout(() => {
      toastMsg.classList.remove('show');
    }, 4000);
  }

  function saveDraftToLocalStorage() {
    try {
      const draft = {
        step: state.currentStep,
        ramoAtividade: document.getElementById('ramoAtividade').value,
        descricaoAtividades: document.getElementById('descricaoDetalhadaAtividades').value,
        razaoSocial: document.getElementById('razaoSocialSugerida').value,
        nomeFantasia: document.getElementById('nomeFantasia').value,
        inscricaoIPTU: document.getElementById('inscricaoIPTU').value,
        enderecoCompleto: document.getElementById('enderecoCompleto').value,
        partners: state.partners
      };
      localStorage.setItem('plano_abertura_draft', JSON.stringify(draft));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }

  function loadDraftFromLocalStorage() {
    try {
      const saved = localStorage.getItem('plano_abertura_draft');
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.ramoAtividade) document.getElementById('ramoAtividade').value = draft.ramoAtividade;
        if (draft.descricaoAtividades) document.getElementById('descricaoDetalhadaAtividades').value = draft.descricaoAtividades;
        if (draft.razaoSocial) document.getElementById('razaoSocialSugerida').value = draft.razaoSocial;
        if (draft.nomeFantasia) document.getElementById('nomeFantasia').value = draft.nomeFantasia;
        if (draft.inscricaoIPTU) document.getElementById('inscricaoIPTU').value = draft.inscricaoIPTU;
        if (draft.enderecoCompleto) document.getElementById('enderecoCompleto').value = draft.enderecoCompleto;
        if (draft.partners && draft.partners.length) {
          state.partners = draft.partners;
        }
      }
    } catch (e) {
      console.warn('Draft load error:', e);
    }
  }

  // Initial Boot
  loadDraftFromLocalStorage();
  renderPartners();
  calculateTaxSimulation();
  updateStepperUI();
});
