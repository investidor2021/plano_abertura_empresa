/* ==========================================================================
   PLANO DE ABERTURA EMPRESA - APPLICATION LOGIC (JS)
   ========================================================================== */

// Configuração da URL do Webhook do Google Apps Script
// (Cole a sua URL aqui para que o formulário online envie automaticamente sem o cliente precisar digitar)
const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbx3Fmw8oNcEuH9AQ86CSrvS2A7-AvZQdkz3Q5CyJju7ghKJT7WZHJzFnq5whU2T9uY/exec';

document.addEventListener('DOMContentLoaded', () => {
  
  // Application State - Technical Guide (Existing)
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
    googleDriveWebhookUrl: localStorage.getItem('drive_webhook_url') || DEFAULT_WEBHOOK_URL
  };

  // State - Client Interview (Simplified Intake Screen)
  const interviewState = {
    currentStep: 1,
    totalSteps: 4,
    haveraSocios: 'Não - Empresa de Titular Único (SLU)',
    partners: [
      {
        id: 1,
        nome: '',
        cpf: '',
        rg: '',
        dataNascimento: '',
        nacionalidade: 'Brasileira',
        estadoCivil: 'Solteiro(a)',
        regimeBens: 'Não aplicável',
        profissao: '',
        endereco: '',
        telefone: '',
        email: '',
        papelSocio: 'Trabalho', // Options: Capital, Trabalho, Mercadoria, Misto
        descricaoMercadoria: '',
        percentualCapital: 100
      }
    ]
  };

  // DOM Element Selectors
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeBtnText = document.getElementById('themeBtnText');
  const htmlElem = document.documentElement;
  
  const toastMsg = document.getElementById('toastMsg');
  const toastText = document.getElementById('toastText');

  /* --------------------------------------------------------------------------
     1. Mode Navigation (Client Interview vs Technical Guide)
     -------------------------------------------------------------------------- */
  const btnModeInterview = document.getElementById('btnModeInterview');
  const btnModeTechnical = document.getElementById('btnModeTechnical');
  const viewClientInterview = document.getElementById('viewClientInterview');
  const viewTechnicalGuide = document.getElementById('viewTechnicalGuide');

  function switchMode(targetMode) {
    if (targetMode === 'interview') {
      btnModeInterview.classList.add('active');
      btnModeTechnical.classList.remove('active');
      viewClientInterview.classList.add('active');
      viewTechnicalGuide.classList.remove('active');
      updateInterviewStepperUI();
    } else {
      btnModeTechnical.classList.add('active');
      btnModeInterview.classList.remove('active');
      viewTechnicalGuide.classList.add('active');
      viewClientInterview.classList.remove('active');
      updateStepperUI();
    }
  }

  btnModeInterview?.addEventListener('click', () => switchMode('interview'));
  btnModeTechnical?.addEventListener('click', () => switchMode('technical'));

  /* --------------------------------------------------------------------------
     2. Theme Switcher (Dark / Light Mode)
     -------------------------------------------------------------------------- */
  themeToggleBtn?.addEventListener('click', () => {
    const currentTheme = htmlElem.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    htmlElem.setAttribute('data-theme', newTheme);
    
    if (newTheme === 'dark') {
      themeBtnText.textContent = 'Modo Claro';
      themeToggleBtn.querySelector('i')?.setAttribute('data-lucide', 'sun');
    } else {
      themeBtnText.textContent = 'Modo Escuro';
      themeToggleBtn.querySelector('i')?.setAttribute('data-lucide', 'moon');
    }
    lucide.createIcons();
  });

  /* --------------------------------------------------------------------------
     3. Client Interview Stepper & Navigation (4 Steps)
     -------------------------------------------------------------------------- */
  function updateInterviewStepperUI() {
    const stepItems = document.querySelectorAll('[data-interview-step]');
    stepItems.forEach((item, idx) => {
      const stepNum = idx + 1;
      item.classList.remove('active', 'completed');
      if (stepNum === interviewState.currentStep) {
        item.classList.add('active');
      } else if (stepNum < interviewState.currentStep) {
        item.classList.add('completed');
      }
    });

    const progressBar = document.getElementById('interviewProgressBar');
    if (progressBar) {
      const progressPercent = ((interviewState.currentStep - 1) / (interviewState.totalSteps - 1)) * 100;
      progressBar.style.width = `${progressPercent}%`;
    }

    const panels = document.querySelectorAll('#interviewForm .step-content-panel');
    panels.forEach((panel, idx) => {
      if (idx + 1 === interviewState.currentStep) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (interviewState.currentStep === 4) {
      renderInterviewSummary();
    }
  }

  document.getElementById('interviewStepperList')?.addEventListener('click', (e) => {
    const stepBtn = e.target.closest('[data-interview-step]');
    if (stepBtn) {
      const targetStep = parseInt(stepBtn.getAttribute('data-interview-step'), 10);
      if (targetStep <= interviewState.currentStep || validateInterviewStep()) {
        interviewState.currentStep = targetStep;
        updateInterviewStepperUI();
      }
    }
  });

  document.querySelectorAll('.btn-int-next').forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateInterviewStep()) {
        interviewState.currentStep = Math.min(interviewState.currentStep + 1, interviewState.totalSteps);
        updateInterviewStepperUI();
      }
    });
  });

  document.querySelectorAll('.btn-int-prev').forEach(btn => {
    btn.addEventListener('click', () => {
      interviewState.currentStep = Math.max(interviewState.currentStep - 1, 1);
      updateInterviewStepperUI();
    });
  });

  function validateInterviewStep() {
    const currentPanel = document.getElementById(`panelIntStep${interviewState.currentStep}`);
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
     4. Dynamic Partners Logic (Client Interview)
     -------------------------------------------------------------------------- */
  const intPartnersContainer = document.getElementById('intPartnersContainer');
  const btnIntAddPartner = document.getElementById('btnIntAddPartner');
  const intHaveraSocios = document.getElementById('intHaveraSocios');

  intHaveraSocios?.addEventListener('change', (e) => {
    const val = e.target.value;
    interviewState.haveraSocios = val;

    if (val.startsWith('Não')) {
      interviewState.partners = [interviewState.partners[0] || createDefaultPartner(1)];
      interviewState.partners[0].percentualCapital = 100;
      if (btnIntAddPartner) btnIntAddPartner.style.display = 'none';
    } else {
      if (btnIntAddPartner) btnIntAddPartner.style.display = 'inline-flex';
    }
    renderInterviewPartners();
  });

  function createDefaultPartner(id = 1) {
    return {
      id,
      nome: '',
      cpf: '',
      rg: '',
      dataNascimento: '',
      nacionalidade: 'Brasileira',
      estadoCivil: 'Solteiro(a)',
      regimeBens: 'Não aplicável',
      profissao: '',
      endereco: '',
      telefone: '',
      email: '',
      papelSocio: 'Trabalho',
      descricaoMercadoria: '',
      percentualCapital: id === 1 ? 100 : 0
    };
  }

  function renderInterviewPartners() {
    if (!intPartnersContainer) return;
    intPartnersContainer.innerHTML = '';

    const isSingle = interviewState.haveraSocios.startsWith('Não');

    interviewState.partners.forEach((partner, index) => {
      const pCard = document.createElement('div');
      pCard.className = 'partner-card';
      
      const titleLabel = isSingle 
        ? '<i data-lucide="user"></i> Dados Pessoais do Empresário (Titular Único)' 
        : `<i data-lucide="user"></i> Sócio ${index + 1} ${index === 0 ? '<span class="badge-emerald">Principal</span>' : ''}`;

      pCard.innerHTML = `
        <div class="partner-card-header">
          <div class="partner-card-title">
            ${titleLabel}
          </div>
          ${(!isSingle && interviewState.partners.length > 1) ? `
            <button type="button" class="btn btn-secondary btn-remove-int-partner" data-index="${index}" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; color: var(--rose-500);">
              <i data-lucide="trash-2"></i> Remover Sócio
            </button>
          ` : ''}
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Nome Completo: <span class="required">*</span></label>
            <input type="text" class="input-text int-p-nome" data-index="${index}" value="${partner.nome}" placeholder="Nome civil completo" required>
          </div>

          <div class="form-group">
            <label class="form-label">CPF: <span class="required">*</span></label>
            <input type="text" class="input-text int-p-cpf" data-index="${index}" value="${partner.cpf}" placeholder="000.000.000-00" required>
          </div>

          <div class="form-group">
            <label class="form-label">RG ou CNH: <span class="required">*</span></label>
            <input type="text" class="input-text int-p-rg" data-index="${index}" value="${partner.rg}" placeholder="Número e Órgão Emissor" required>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Data de Nascimento: <span class="required">*</span></label>
            <input type="date" class="input-text int-p-nascimento" data-index="${index}" value="${partner.dataNascimento}" required>
          </div>

          <div class="form-group">
            <label class="form-label">Telefone / WhatsApp: <span class="required">*</span></label>
            <input type="text" class="input-text int-p-telefone" data-index="${index}" value="${partner.telefone}" placeholder="(00) 00000-0000" required>
          </div>

          <div class="form-group">
            <label class="form-label">E-mail: <span class="required">*</span></label>
            <input type="email" class="input-text int-p-email" data-index="${index}" value="${partner.email}" placeholder="email@exemplo.com" required>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Estado Civil: <span class="required">*</span></label>
            <select class="select-input int-p-estadocivil" data-index="${index}">
              <option value="Solteiro(a)" ${partner.estadoCivil === 'Solteiro(a)' ? 'selected' : ''}>Solteiro(a)</option>
              <option value="Casado(a)" ${partner.estadoCivil === 'Casado(a)' ? 'selected' : ''}>Casado(a)</option>
              <option value="Divorciado(a)" ${partner.estadoCivil === 'Divorciado(a)' ? 'selected' : ''}>Divorciado(a)</option>
              <option value="Viúvo(a)" ${partner.estadoCivil === 'Viúvo(a)' ? 'selected' : ''}>Viúvo(a)</option>
              <option value="União Estável" ${partner.estadoCivil === 'União Estável' ? 'selected' : ''}>União Estável</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Profissão: <span class="required">*</span></label>
            <input type="text" class="input-text int-p-profissao" data-index="${index}" value="${partner.profissao}" placeholder="Ex: Comerciante, Administrador..." required>
          </div>

          ${!isSingle ? `
            <div class="form-group">
              <label class="form-label">% Cotas no Capital: <span class="required">*</span></label>
              <input type="number" class="input-text int-p-percentual" data-index="${index}" value="${partner.percentualCapital}" min="1" max="100" required>
            </div>
          ` : ''}
        </div>

        <div class="form-group">
          <label class="form-label">Endereço Residencial Completo: <span class="required">*</span></label>
          <input type="text" class="input-text int-p-endereco" data-index="${index}" value="${partner.endereco}" placeholder="Rua, Nº, Bairro, CEP, Cidade/UF" required>
        </div>

        ${!isSingle ? `
          <!-- Papel do Sócio no Negócio (Capital vs Trabalho vs Mercadoria) -->
          <div style="background: var(--bg-card-subtle); padding: 1rem; border-radius: var(--radius-md); margin-top: 0.75rem; border: 1px solid var(--border-color);">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 700; color: var(--primary-700);">
                <i data-lucide="briefcase"></i> Papel / Participação deste Sócio no Negócio: <span class="required">*</span>
              </label>
              <select class="select-input int-p-papel" data-index="${index}" style="font-weight: 600;">
                <option value="Trabalho" ${partner.papelSocio === 'Trabalho' ? 'selected' : ''}>Sócio de Serviço / Trabalho (Atua ativamente no dia a dia)</option>
                <option value="Capital" ${partner.papelSocio === 'Capital' ? 'selected' : ''}>Sócio de Capital (Apenas investe recursos financeiros)</option>
                <option value="Mercadoria" ${partner.papelSocio === 'Mercadoria' ? 'selected' : ''}>Sócio Mercadoria / Produtos (Entra com estoque ou equipamentos)</option>
                <option value="Misto" ${partner.papelSocio === 'Misto' ? 'selected' : ''}>Sócio Misto (Capital + Serviço e/ou Mercadoria)</option>
              </select>
            </div>

            <div class="form-group int-p-mercadoria-box" data-index="${index}" style="${(partner.papelSocio === 'Mercadoria' || partner.papelSocio === 'Misto') ? 'display: block;' : 'display: none;'} margin-top: 0.75rem; margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.85rem; color: var(--accent-emerald-dark); font-weight: 600;">
                <i data-lucide="package"></i> Detalhe os produtos, mercadorias ou equipamentos trazidos por este sócio:
              </label>
              <textarea class="textarea-input int-p-desc-mercadoria" data-index="${index}" placeholder="Ex: Estoque inicial de vestuário avaliado em R$ 15.000, 2 computadores Dell, ferramentas de trabalho...">${partner.descricaoMercadoria || ''}</textarea>
            </div>
          </div>
        ` : ''}
      `;

      intPartnersContainer.appendChild(pCard);
    });

    lucide.createIcons();
    attachInterviewPartnerInputListeners();
  }

  function attachInterviewPartnerInputListeners() {
    document.querySelectorAll('.int-p-nome').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        interviewState.partners[idx].nome = e.target.value;
      });
    });

    document.querySelectorAll('.int-p-cpf').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        interviewState.partners[idx].cpf = e.target.value;
      });
    });

    document.querySelectorAll('.int-p-rg').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        interviewState.partners[idx].rg = e.target.value;
      });
    });

    document.querySelectorAll('.int-p-nascimento').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        interviewState.partners[idx].dataNascimento = e.target.value;
      });
    });

    document.querySelectorAll('.int-p-estadocivil').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        interviewState.partners[idx].estadoCivil = e.target.value;
      });
    });

    document.querySelectorAll('.int-p-profissao').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        interviewState.partners[idx].profissao = e.target.value;
      });
    });

    document.querySelectorAll('.int-p-telefone').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        interviewState.partners[idx].telefone = e.target.value;
      });
    });

    document.querySelectorAll('.int-p-email').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        interviewState.partners[idx].email = e.target.value;
      });
    });

    document.querySelectorAll('.int-p-endereco').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        interviewState.partners[idx].endereco = e.target.value;
      });
    });

    document.querySelectorAll('.int-p-percentual').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        interviewState.partners[idx].percentualCapital = parseFloat(e.target.value) || 0;
      });
    });

    document.querySelectorAll('.int-p-papel').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        const val = e.target.value;
        interviewState.partners[idx].papelSocio = val;

        const mercBox = document.querySelector(`.int-p-mercadoria-box[data-index="${idx}"]`);
        if (mercBox) {
          mercBox.style.display = (val === 'Mercadoria' || val === 'Misto') ? 'block' : 'none';
        }
      });
    });

    document.querySelectorAll('.int-p-desc-mercadoria').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        interviewState.partners[idx].descricaoMercadoria = e.target.value;
      });
    });

    document.querySelectorAll('.btn-remove-int-partner').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        interviewState.partners.splice(idx, 1);
        renderInterviewPartners();
      });
    });
  }

  btnIntAddPartner?.addEventListener('click', () => {
    interviewState.partners.push(createDefaultPartner(interviewState.partners.length + 1));
    renderInterviewPartners();
  });

  /* --------------------------------------------------------------------------
     5. Render Interview Summary (Step 4)
     -------------------------------------------------------------------------- */
  function renderInterviewSummary() {
    const container = document.getElementById('intSummaryView');
    if (!container) return;

    const oQueFara = document.getElementById('intOQueEmpresaFara')?.value || '-';
    const tipoOperacao = document.getElementById('intTipoOperacao')?.value || '-';
    const modoExecucao = document.getElementById('intModoExecucao')?.value || '-';
    const quaisProdutos = document.getElementById('intQuaisProdutos')?.value || 'Não informado';
    const quaisServicos = document.getElementById('intQuaisServicos')?.value || 'Não informado';
    const haveraEstoque = document.getElementById('intHaveraEstoque')?.value || '-';
    const haveraFuncionarios = document.getElementById('intHaveraFuncionarios')?.value || '-';

    const vinculoImovel = document.getElementById('intTipoVinculoImovel')?.value || '-';
    const cep = document.getElementById('intCep')?.value || '';
    const logradouro = document.getElementById('intLogradouro')?.value || '';
    const bairro = document.getElementById('intBairro')?.value || '';
    const municipio = document.getElementById('intMunicipioUf')?.value || '';
    const iptu = document.getElementById('intInscricaoIptu')?.value || 'Não informado';

    const razao1 = document.getElementById('intRazao1')?.value || '-';
    const razao2 = document.getElementById('intRazao2')?.value || 'Não informado';
    const nomeFantasia = document.getElementById('intNomeFantasia')?.value || 'Não informado';

    const capitalVal = parseFloat(document.getElementById('intCapitalTotalVal')?.value) || 10000;
    const fatEstimadoText = document.getElementById('intFatMensalRealista')?.options[document.getElementById('intFatMensalRealista')?.selectedIndex]?.text || 'R$ 25.000 / mês';

    const debitosFiscais = document.getElementById('intDebitosFiscais')?.value || 'Não';
    const servidorPublico = document.getElementById('intServidorPublico')?.value || 'Não';

    const isSingle = interviewState.haveraSocios.startsWith('Não');

    const totalAnexos = interviewFilesState.cnh.length + interviewFilesState.comprovanteResidencia.length + interviewFilesState.outrosDocs.length;

    container.innerHTML = `
      <div style="background: var(--primary-700); color: #fff; padding: 1rem 1.5rem; border-radius: var(--radius-md) var(--radius-md) 0 0; margin: -1.75rem -1.75rem 1.5rem -1.75rem; display: flex; justify-content: space-between; align-items: center;">
        <h2 style="font-size: 1.2rem; color: #fff;"><i data-lucide="clipboard-check"></i> FICHA RESUMIDA DE SOLICITAÇÃO DE ABERTURA</h2>
        <span style="font-size: 0.8rem; background: rgba(255,255,255,0.2); padding: 0.2rem 0.6rem; border-radius: 999px;">Data: ${new Date().toLocaleDateString('pt-BR')}</span>
      </div>

      <div class="summary-section">
        <h3><i data-lucide="users"></i> 1. Empresário & Quadro Societário (${isSingle ? 'Empresa Individual' : interviewState.partners.length + ' Sócios'})</h3>
        <div style="display: grid; gap: 1rem;">
          ${interviewState.partners.map((p, idx) => {
            let papelBadge = '';
            if (p.papelSocio === 'Mercadoria') papelBadge = '<span class="badge-amber" style="background: #fef3c7; color: #92400e; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700;">📦 Sócio Mercadoria/Produtos</span>';
            else if (p.papelSocio === 'Capital') papelBadge = '<span style="background: #e0f2fe; color: #0369a1; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700;">💰 Sócio de Capital</span>';
            else if (p.papelSocio === 'Misto') papelBadge = '<span style="background: #f3e8ff; color: #6b21a8; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700;">⚡ Sócio Misto</span>';
            else papelBadge = '<span style="background: #dcfce7; color: #166534; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700;">💼 Sócio de Serviço / Trabalho</span>';

            return `
              <div style="background: var(--bg-card); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <div style="font-weight: 700; color: var(--primary-700); font-size: 1.05rem;">
                    ${isSingle ? 'Empresário / Titular Principal' : `Sócio ${idx + 1}: ${p.nome || 'Não informado'}`} (${p.percentualCapital}% das Cotas)
                  </div>
                  <div>${papelBadge}</div>
                </div>
                <div class="summary-grid">
                  <div><strong>CPF:</strong> ${p.cpf || '-'}</div>
                  <div><strong>RG/CNH:</strong> ${p.rg || '-'}</div>
                  <div><strong>Data Nasc:</strong> ${p.dataNascimento || '-'}</div>
                  <div><strong>Estado Civil:</strong> ${p.estadoCivil}</div>
                  <div><strong>Profissão:</strong> ${p.profissao || '-'}</div>
                  <div><strong>Telefone:</strong> ${p.telefone || '-'}</div>
                  <div><strong>E-mail:</strong> ${p.email || '-'}</div>
                  <div style="grid-column: span 2;"><strong>Endereço Residencial:</strong> ${p.endereco || '-'}</div>
                </div>
                ${(p.papelSocio === 'Mercadoria' || p.papelSocio === 'Misto') && p.descricaoMercadoria ? `
                  <div style="margin-top: 0.5rem; padding: 0.5rem; background: #fffbebfb; border: 1px solid #fcd34d; border-radius: 6px; font-size: 0.85rem; color: #92400e;">
                    <strong>📦 Mercadorias / Produtos do Sócio:</strong> ${p.descricaoMercadoria}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
        <div style="margin-top: 0.75rem; background: var(--bg-card-subtle); padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); font-size: 0.88rem;">
          <div><strong>Possui débitos/restrições fiscais?</strong> ${debitosFiscais}</div>
          <div><strong>É servidor público ativo?</strong> ${servidorPublico}</div>
        </div>
      </div>

      <div class="summary-section">
        <h3><i data-lucide="briefcase"></i> 2. Informações do Negócio & Operação</h3>
        <div class="summary-grid">
          <div class="summary-item" style="grid-column: span 2;"><strong>Atividade Principal:</strong> <span>${oQueFara}</span></div>
          <div class="summary-item"><strong>Tipo de Atendimento:</strong> <span>${tipoOperacao}</span></div>
          <div class="summary-item"><strong>Modo de Execução:</strong> <span>${modoExecucao}</span></div>
          <div class="summary-item"><strong>Produtos / Mercadorias:</strong> <span>${quaisProdutos}</span></div>
          <div class="summary-item"><strong>Serviços Prestados:</strong> <span>${quaisServicos}</span></div>
          <div class="summary-item"><strong>Estoque no Local:</strong> <span>${haveraEstoque}</span></div>
          <div class="summary-item"><strong>Funcionários Iniciais:</strong> <span>${haveraFuncionarios}</span></div>
        </div>
      </div>

      <div class="summary-section">
        <h3><i data-lucide="map-pin"></i> 3. Endereço & Opções de Nome</h3>
        <div class="summary-grid">
          <div class="summary-item"><strong>Uso do Imóvel:</strong> <span>${vinculoImovel}</span></div>
          <div class="summary-item"><strong>IPTU do Imóvel:</strong> <span>${iptu}</span></div>
          <div class="summary-item" style="grid-column: span 2;"><strong>Endereço da Empresa:</strong> <span>${logradouro}, ${bairro} - ${municipio} (CEP: ${cep})</span></div>
          <div class="summary-item"><strong>1ª Opção Razão Social:</strong> <span>${razao1}</span></div>
          <div class="summary-item"><strong>2ª Opção Razão Social:</strong> <span>${razao2}</span></div>
          <div class="summary-item"><strong>Nome Fantasia:</strong> <span>${nomeFantasia}</span></div>
        </div>
      </div>

      <div class="summary-section">
        <h3><i data-lucide="coins"></i> 4. Estimativas Iniciais</h3>
        <div class="summary-grid">
          <div class="summary-item"><strong>Capital Social Estimado:</strong> <span>${formatCurrency(capitalVal)}</span></div>
          <div class="summary-item"><strong>Expectativa de Faturamento:</strong> <span>${fatEstimadoText}</span></div>
        </div>
      </div>

      <div class="summary-section">
        <h3><i data-lucide="paperclip"></i> 5. Documentos Anexados (${totalAnexos} arquivo(s))</h3>
        <div class="summary-grid">
          <div class="summary-item"><strong>CNH / RG (Identificação):</strong> <span>${interviewFilesState.cnh.length ? interviewFilesState.cnh.map(f => f.fileName).join(', ') : 'Nenhum anexo'}</span></div>
          <div class="summary-item"><strong>Comprovante de Endereço:</strong> <span>${interviewFilesState.comprovanteResidencia.length ? interviewFilesState.comprovanteResidencia.map(f => f.fileName).join(', ') : 'Nenhum anexo'}</span></div>
          <div class="summary-item" style="grid-column: span 2;"><strong>IPTU / Outros Documentos:</strong> <span>${interviewFilesState.outrosDocs.length ? interviewFilesState.outrosDocs.map(f => f.fileName).join(', ') : 'Nenhum anexo'}</span></div>
        </div>
      </div>

      <div class="summary-section" style="background: var(--accent-emerald-bg); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--accent-emerald);">
        <h3 style="color: var(--accent-emerald-dark); margin-bottom: 0.5rem;"><i data-lucide="check-circle-2"></i> Próximos Passos (Equipe Contábil):</h3>
        <p style="font-size: 0.95rem; color: var(--text-primary); font-weight: 500;">
          Sua solicitação e documentos anexados serão analisados pela nossa equipe contábil. Faremos o estudo de viabilidade na prefeitura, consulta de CNAEs e definição da melhor opção tributária para a sua empresa!
        </p>
      </div>
    `;

    const intInputDriveUrl = document.getElementById('intInputDriveUrl');
    if (intInputDriveUrl && state.googleDriveWebhookUrl) {
      intInputDriveUrl.value = state.googleDriveWebhookUrl;
    }

    lucide.createIcons();
  }

  /* --------------------------------------------------------------------------
     6. Client Interview Actions (Google Drive & PDF)
     -------------------------------------------------------------------------- */
  const interviewFilesState = {
    cnh: [],
    comprovanteResidencia: [],
    outrosDocs: []
  };

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const base64Data = dataUrl.split(',')[1] || dataUrl;
        resolve({
          fileName: file.name,
          nomeArquivo: file.name,
          fileType: file.type || 'application/octet-stream',
          mimeType: file.type || 'application/octet-stream',
          tamanhoBytes: file.size,
          base64: base64Data
        });
      };
      reader.onerror = err => reject(err);
      reader.readAsDataURL(file);
    });
  }

  function setupInterviewFileInputListeners() {
    const inputCnh = document.getElementById('intFileCnh');
    const inputComp = document.getElementById('intFileComprovanteResidencia');
    const inputOutros = document.getElementById('intFileIptuOutros');

    inputCnh?.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      interviewFilesState.cnh = await Promise.all(files.map(fileToBase64));
      updateFileListDisplay('intFileCnhList', interviewFilesState.cnh);
      renderInterviewSummary();
    });

    inputComp?.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      interviewFilesState.comprovanteResidencia = await Promise.all(files.map(fileToBase64));
      updateFileListDisplay('intFileComprovanteList', interviewFilesState.comprovanteResidencia);
      renderInterviewSummary();
    });

    inputOutros?.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      interviewFilesState.outrosDocs = await Promise.all(files.map(fileToBase64));
      updateFileListDisplay('intFileOutrosList', interviewFilesState.outrosDocs);
      renderInterviewSummary();
    });
  }

  function updateFileListDisplay(elementId, fileArray) {
    const container = document.getElementById(elementId);
    if (!container) return;
    if (fileArray.length === 0) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = `📎 ${fileArray.length} arquivo(s): ${fileArray.map(f => f.fileName).join(', ')}`;
  }

  setupInterviewFileInputListeners();

  document.getElementById('btnIntTestDriveConnection')?.addEventListener('click', async () => {
    const inputUrl = document.getElementById('intInputDriveUrl');
    const statusText = document.getElementById('intDriveStatusText');
    const url = inputUrl.value.trim();

    if (!url) {
      statusText.style.color = 'var(--rose-500)';
      statusText.textContent = '❌ Por favor, informe a URL do Webhook do Apps Script.';
      return;
    }

    statusText.style.color = 'var(--primary-600)';
    statusText.textContent = '🔄 Testando conexão com o Google Drive...';

    try {
      await fetch(url);
      state.googleDriveWebhookUrl = url;
      localStorage.setItem('drive_webhook_url', url);
      statusText.style.color = 'var(--accent-emerald-dark)';
      statusText.textContent = '✅ Conexão estabelecida e confirmada!';
      showToast('Conexão com o Google Drive ativada!', 'emerald');
    } catch (e) {
      statusText.style.color = 'var(--amber-500)';
      statusText.textContent = '⚠️ Webhook configurado. Caso não salve, verifique permissões no Apps Script.';
    }
  });

  document.getElementById('btnIntDownloadPDF')?.addEventListener('click', () => {
    window.print();
  });

  document.getElementById('btnIntUploadDrive')?.addEventListener('click', async () => {
    const inputUrl = document.getElementById('intInputDriveUrl');
    let webhookUrl = (inputUrl && inputUrl.value.trim()) || state.googleDriveWebhookUrl || DEFAULT_WEBHOOK_URL;

    if (!webhookUrl || webhookUrl.indexOf('http') === -1) {
      webhookUrl = prompt('Por favor, informe a URL do Webhook do Google Apps Script (termina em /exec):');
      if (!webhookUrl) return;
      webhookUrl = webhookUrl.trim();
      if (inputUrl) inputUrl.value = webhookUrl;
    }

    state.googleDriveWebhookUrl = webhookUrl;
    localStorage.setItem('drive_webhook_url', webhookUrl);
    showToast('Enviando Ficha e Anexos para o Google Drive...', 'primary');

    try {
      const payload = getInterviewPayloadObject();
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      showToast('Ficha e Anexos enviados para o Google Drive com sucesso!', 'emerald');
      alert('✅ Dados e Anexos Enviados com Sucesso!\n\nOs dados do formulário e todos os documentos anexados (CNH, Comprovante de Endereço, etc.) foram salvos na sua pasta do Google Drive.');
    } catch (err) {
      console.error(err);
      showToast('Erro ao conectar com o Google Drive.', 'rose');
    }
  });

  function getInterviewPayloadObject() {
    const anexosPayload = [];

    interviewFilesState.cnh.forEach(f => {
      anexosPayload.push({ categoria: 'CNH / RG (Identificação)', ...f });
    });
    interviewFilesState.comprovanteResidencia.forEach(f => {
      anexosPayload.push({ categoria: 'Comprovante de Endereço', ...f });
    });
    interviewFilesState.outrosDocs.forEach(f => {
      anexosPayload.push({ categoria: 'IPTU / Outros Documentos', ...f });
    });

    return {
      tipoFormulario: 'Entrevista Simplificada de Abertura de Empresa (Cliente)',
      timestamp: new Date().toISOString(),
      haveraSocios: interviewState.haveraSocios,
      socios: interviewState.partners.map(p => ({
        nome: p.nome,
        cpf: p.cpf,
        rg: p.rg,
        dataNascimento: p.dataNascimento,
        estadoCivil: p.estadoCivil,
        profissao: p.profissao,
        telefone: p.telefone,
        email: p.email,
        endereco: p.endereco,
        papelSocio: p.papelSocio,
        descricaoMercadoria: p.descricaoMercadoria || '',
        percentualCapital: p.percentualCapital
      })),
      verificacoesSimples: {
        debitosFiscais: document.getElementById('intDebitosFiscais')?.value || 'Não',
        servidorPublico: document.getElementById('intServidorPublico')?.value || 'Não'
      },
      dadosOperacionais: {
        oQueEmpresaFara: document.getElementById('intOQueEmpresaFara')?.value || '',
        tipoOperacao: document.getElementById('intTipoOperacao')?.value || '',
        modoExecucao: document.getElementById('intModoExecucao')?.value || '',
        quaisProdutos: document.getElementById('intQuaisProdutos')?.value || '',
        quaisServicos: document.getElementById('intQuaisServicos')?.value || '',
        estoqueLocal: document.getElementById('intHaveraEstoque')?.value || '',
        funcionarios: document.getElementById('intHaveraFuncionarios')?.value || ''
      },
      enderecoEmpresa: {
        usoImovel: document.getElementById('intTipoVinculoImovel')?.value || '',
        cep: document.getElementById('intCep')?.value || '',
        logradouro: document.getElementById('intLogradouro')?.value || '',
        bairro: document.getElementById('intBairro')?.value || '',
        municipioUf: document.getElementById('intMunicipioUf')?.value || '',
        inscricaoIptu: document.getElementById('intInscricaoIptu')?.value || ''
      },
      dadosNomes: {
        razaoOpcao1: document.getElementById('intRazao1')?.value || '',
        razaoOpcao2: document.getElementById('intRazao2')?.value || '',
        nomeFantasia: document.getElementById('intNomeFantasia')?.value || ''
      },
      estimativaInicial: {
        capitalSocial: parseFloat(document.getElementById('intCapitalTotalVal')?.value) || 10000,
        faturamentoMensalPrevisto: document.getElementById('intFatMensalRealista')?.value || '25000'
      },
      anexos: anexosPayload,
      documentosAnexadosFiles: anexosPayload
    };
  }

  /* --------------------------------------------------------------------------
     8. Technical Guide Stepper & Logic (View 2 - Existing App Code)
     -------------------------------------------------------------------------- */
  function updateStepperUI() {
    const stepItems = document.querySelectorAll('#stepperList .step-item');
    stepItems.forEach((item, idx) => {
      const stepNum = idx + 1;
      item.classList.remove('active', 'completed');
      if (stepNum === state.currentStep) {
        item.classList.add('active');
      } else if (stepNum < state.currentStep) {
        item.classList.add('completed');
      }
    });

    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
      const progressPercent = ((state.currentStep - 1) / (state.totalSteps - 1)) * 100;
      progressBar.style.width = `${progressPercent}%`;
    }

    const panels = document.querySelectorAll('#companyOpeningForm .step-content-panel');
    panels.forEach((panel, idx) => {
      if (idx + 1 === state.currentStep) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (state.currentStep === 7) {
      renderSummaryView();
    }
  }

  document.getElementById('stepperList')?.addEventListener('click', (e) => {
    const stepBtn = e.target.closest('.step-item');
    if (stepBtn) {
      const targetStep = parseInt(stepBtn.getAttribute('data-step'), 10);
      if (targetStep <= state.currentStep || validateCurrentStep()) {
        state.currentStep = targetStep;
        updateStepperUI();
      }
    }
  });

  document.querySelectorAll('#viewTechnicalGuide .btn-next-step').forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateCurrentStep()) {
        state.currentStep = Math.min(state.currentStep + 1, state.totalSteps);
        updateStepperUI();
      }
    });
  });

  document.querySelectorAll('#viewTechnicalGuide .btn-prev-step').forEach(btn => {
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

  function calculateTaxSimulation() {
    const simFaturamentoMensal = document.getElementById('simFaturamentoMensal');
    const simTipoAtividade = document.getElementById('simTipoAtividade');
    if (!simFaturamentoMensal || !simTipoAtividade) return;

    const mensFaturamento = parseFloat(simFaturamentoMensal.value) || 0;
    const anualFaturamento = mensFaturamento * 12;
    const tipoOperacao = simTipoAtividade.value;

    let regimeSugerido = 'Simples Nacional';
    let aliquotaEfetiva = 0.06;
    let noteText = '';

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

    switch (tipoOperacao) {
      case 'comercio':
        aliquotaEfetiva = anualFaturamento <= 180000 ? 0.04 : 0.073;
        noteText = `Para <strong>Comércio</strong>, o enquadramento no <strong>Simples Nacional (Anexo I)</strong> inicia em 4.00%.`;
        break;
      case 'industria':
        aliquotaEfetiva = anualFaturamento <= 180000 ? 0.045 : 0.078;
        noteText = `Para <strong>Indústria</strong>, o enquadramento no <strong>Simples Nacional (Anexo II)</strong> inicia em 4.50%.`;
        break;
      default:
        aliquotaEfetiva = anualFaturamento <= 180000 ? 0.06 : 0.112;
        noteText = `Para <strong>Serviços Gerais</strong>, o <strong>Simples Nacional (Anexo III)</strong> inicia em 6.00%.`;
        break;
    }

    const impostoEstimado = mensFaturamento * aliquotaEfetiva;
    document.getElementById('simResultAnual').textContent = formatCurrency(anualFaturamento);
    document.getElementById('simResultRegime').textContent = regimeSugerido;
    document.getElementById('simResultAliquota').textContent = `${(aliquotaEfetiva * 100).toFixed(2)}%`;
    document.getElementById('simResultImpostoMensal').textContent = formatCurrency(impostoEstimado);
    document.getElementById('simNoteText').innerHTML = noteText;
  }

  document.getElementById('simFaturamentoMensal')?.addEventListener('input', calculateTaxSimulation);
  document.getElementById('simTipoAtividade')?.addEventListener('change', calculateTaxSimulation);

  function renderPartners() {
    const container = document.getElementById('partnersContainer');
    if (!container) return;
    container.innerHTML = '';

    state.partners.forEach((partner, index) => {
      const pCard = document.createElement('div');
      pCard.className = 'partner-card';
      pCard.innerHTML = `
        <div class="partner-card-header">
          <div class="partner-card-title"><i data-lucide="user"></i> Sócio ${index + 1}</div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Nome Completo:</label>
            <input type="text" class="input-text tech-p-nome" data-index="${index}" value="${partner.nome}">
          </div>
          <div class="form-group">
            <label class="form-label">CPF:</label>
            <input type="text" class="input-text tech-p-cpf" data-index="${index}" value="${partner.cpf}">
          </div>
        </div>
      `;
      container.appendChild(pCard);
    });
    lucide.createIcons();
  }

  function renderSummaryView() {
    const summaryView = document.getElementById('summaryView');
    if (!summaryView) return;

    summaryView.innerHTML = `
      <div class="summary-section">
        <h3><i data-lucide="building"></i> Resumo do Dossiê Técnico de Abertura</h3>
        <div class="summary-grid">
          <div class="summary-item"><strong>Ramo de Atividade:</strong> <span>${document.getElementById('ramoAtividade')?.value || '-'}</span></div>
          <div class="summary-item"><strong>Razão Social:</strong> <span>${document.getElementById('razaoSocialSugerida')?.value || '-'}</span></div>
          <div class="summary-item"><strong>Inscrição IPTU:</strong> <span>${document.getElementById('inscricaoIPTU')?.value || '-'}</span></div>
          <div class="summary-item"><strong>Endereço Sede:</strong> <span>${document.getElementById('enderecoCompleto')?.value || '-'}</span></div>
        </div>
      </div>
    `;
    lucide.createIcons();
  }

  document.getElementById('btnDownloadPDF')?.addEventListener('click', () => window.print());
  document.getElementById('btnExportJSON')?.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "Dossie_Tecnico_Abertura.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  /* --------------------------------------------------------------------------
     9. Utility Functions
     -------------------------------------------------------------------------- */
  function formatCurrency(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  }

  function showToast(msg, type = 'primary') {
    if (!toastText || !toastMsg) return;
    toastText.textContent = msg;
    toastMsg.className = `toast-msg show ${type}`;
    setTimeout(() => {
      toastMsg.classList.remove('show');
    }, 4000);
  }

  // Initial Boot
  renderInterviewPartners();
  renderPartners();
  calculateTaxSimulation();
  updateInterviewStepperUI();
  updateStepperUI();
});
