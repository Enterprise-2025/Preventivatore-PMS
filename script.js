// ✅ Protezione accesso
(function protezioneAccesso() {
  const refOk = document.referrer.includes("enterprise-2025.github.io") || window.opener;
  const accessoConsentito = localStorage.getItem("accesso_consentito") === "ok";
  if (!accessoConsentito || !refOk) {
    document.body.innerHTML = "<h2 style='color: red; text-align: center;'>Accesso non autorizzato</h2>";
    setTimeout(() => location.replace("https://enterprise-2025.github.io/"), 1500);
  }
})();
// ==========================
// Preventivatore QPWON Drag & Drop - Script.js
// ==========================

// === CONFIGURAZIONE LISTINI ===
const soglie = [1, 2, 4, 6, 8, 10, 15, 20];
const prezziBundle = {
  Starter: [109, 99, 89, 69, 59, 49, 29, 19],
  Plus:    [144,134,124,104,84,74,64,54],
  VIP:     [154,144,134,114,94,84,74,64]
};
const prezziSetup = [99,119,129,149,199,299,499,899];
const visibilityFasce = [
  { min: 5, max: 10, prezzo: 44 },
  { min: 11, max: 15, prezzo: 39 },
  { min: 16, max: 20, prezzo: 34 },
  { min: 21, max: 30, prezzo: 29 },
  { min: 31, max: 40, prezzo: 24 },
  { min: 41, max: 50, prezzo: 19 },
  { min: 51, max: 70, prezzo: 15 },
  { min: 71, max: 999, prezzo: 12 }
];

// === VARIABILI GLOBALI ===
let serviziSelezionati = [];
let durata = 12;
let promoAttiva = false;
let progressAttiva = false;
let timerInterval = null;

// === FUNZIONI UTILI ===
function getSogliaIdx(n) {
  for (let i = 0; i < soglie.length; i++) if (n <= soglie[i]) return i;
  return soglie.length - 1;
}
function getPrezzoVisibility(n) {
  for (let f of visibilityFasce) if (n >= f.min && n <= f.max) return f.prezzo;
  return 0;
}
function getScontoDurata() {
  if (durata === 24) return 0.08;
  if (durata === 36) return 0.12;
  if (durata === 48) return 0.18;
  return 0;
}
function getPromoPerc() {
  if (durata === 12) return 0.15;
  if (durata === 24) return 0.10;
  if (durata === 36) return 0.08;
  if (durata === 48) return 0.05;
  return 0.15;
}

// === CALCOLO PREZZI ===
function prezzoBundle(nome, nStanze) {
  const idx = getSogliaIdx(nStanze);
  let base = prezziBundle[nome][idx] * nStanze;
  let prezzo = base * 1.3;
  const sconto = getScontoDurata();
  if (sconto > 0) prezzo *= (1 - sconto);
  return Math.round(prezzo);
}
function prezzoBundlePromo(nome, nStanze) {
  const idx = getSogliaIdx(nStanze);
  let base = prezziBundle[nome][idx] * nStanze;
  return Math.round(base * (1 + getPromoPerc()));
}
function prezzoVisibility(n) {
  let p = getPrezzoVisibility(n) * n * 1.3;
  const sconto = getScontoDurata();
  if (sconto > 0) p *= (1 - sconto);
  return Math.round(p);
}
function prezzoVisibilityPromo(n) {
  let base = getPrezzoVisibility(n) * n;
  return Math.round(base * (1 + getPromoPerc()));
}
function prezzoSetup(nStanze) {
  const idx = getSogliaIdx(nStanze);
  let p = prezziSetup[idx] * 7;
  const sconto = getScontoDurata();
  if (sconto > 0) p *= (1 - sconto);
  return Math.round(p);
}
function prezzoSetupPromo(nStanze) {
  const idx = getSogliaIdx(nStanze);
  let base = prezziSetup[idx] * 3;
  return Math.round(base * (1 + getPromoPerc()));
}

// === LOGICA SETUP/CRM ===
function aggiornaSetupFee() {
  const bundle = serviziSelezionati.find(s => ["Starter", "Plus", "VIP"].includes(s.nome));
  const nStanze = bundle ? bundle.nStanze : null;
  const idx = serviziSelezionati.findIndex(s => s.fixed);
  const feeObj = {
    nome: "Attivazione / Formazione",
    prezzo: nStanze ? prezzoSetup(nStanze) : '',
    tipo: "setup",
    fixed: true,
    nStanze: nStanze
  };
  if (idx === -1) serviziSelezionati.unshift(feeObj);
  else serviziSelezionati[idx] = feeObj;
}
function sincronizzaCRM() {
  const bundle = serviziSelezionati.find(s => ["Starter", "Plus", "VIP"].includes(s.nome));
  let crmIdx = serviziSelezionati.findIndex(s => s.nome === "CRM MioDottore");
  if (!bundle && crmIdx !== -1) serviziSelezionati.splice(crmIdx, 1);
  else if (bundle && crmIdx !== -1) serviziSelezionati[crmIdx].quantita = bundle.nStanze;
}

// === AGGIORNA PREVENTIVO (RENDER) ===
function aggiornaPreventivo() {
  aggiornaSetupFee();
  sincronizzaCRM();
  renderPreventivo();
  aggiornaProgressBar();
  aggiornaPromoPanel();
}
function renderPreventivo() {
  const dropzone = document.getElementById('dropzone');
  dropzone.innerHTML = '';
  if (serviziSelezionati.length === 0) {
    dropzone.innerHTML = '<p style="color:#94a3b8;margin:0;">Trascina qui i servizi che vuoi attivare</p>';
    aggiornaTotali(0,0);
    return;
  }
  let totaleMensile = 0, totaleSetup = 0;
  serviziSelezionati.forEach((serv, idx) => {
    let card = document.createElement('div');
    card.className = 'voce-preventivo';
    let quantitaInput = '', prezzo = '';
    if (serv.fixed) {
      card.innerHTML = `<span class="nome">${serv.nome}</span>
      <span class="prezzo">${serv.prezzo !== '' ? serv.prezzo + ' € una tantum' : '<span style="color:#bbb">—</span>'}</span>`;
      dropzone.appendChild(card);
      if (serv.prezzo !== '') totaleSetup += prezzoSetup(serv.nStanze);
      return;
    }
    if (["Starter", "Plus", "VIP"].includes(serv.nome)) {
      prezzo = prezzoBundle(serv.nome, serv.nStanze || 1);
      quantitaInput = `Stanze:
      <button type="button" class="btn-qty" onclick="modificaQuantita(${idx}, -1, 1, 20)">-</button>
      <input type="number" min="1" max="20" value="${serv.nStanze || 1}" style="width:40px;text-align:center;font-size:15px;" onchange="modificaQuantitaDiretta(this.value, ${idx}, 1, 20)" />
      <button type="button" class="btn-qty" onclick="modificaQuantita(${idx}, 1, 1, 20)">+</button>`;
      prezzo += " € /mese";
      totaleMensile += prezzoBundle(serv.nome, serv.nStanze || 1);
    }
    else if (serv.nome === "CRM MioDottore") {
      const bundle = serviziSelezionati.find(s => ["Starter", "Plus", "VIP"].includes(s.nome));
      const nStanze = bundle ? bundle.nStanze : 1;
      serv.quantita = nStanze;
      quantitaInput = `Stanze: <input type="number" value="${nStanze}" readonly style="width:40px;text-align:center;font-size:15px;background:#f1f5f9;pointer-events:none;" />`;
      prezzo = (serv.quantita * 10) + " € /mese";
      totaleMensile += serv.quantita * 10;
    }
    else if (serv.nome === "Visibility MioDottore") {
      quantitaInput = `Medici:
      <button type="button" class="btn-qty" onclick="modificaQuantita(${idx}, -1, 5, 99)">-</button>
      <input type="number" min="5" max="99" value="${serv.quantita}" style="width:44px;text-align:center;font-size:15px;" onchange="modificaQuantitaDiretta(this.value, ${idx}, 5, 99)" />
      <button type="button" class="btn-qty" onclick="modificaQuantita(${idx}, 1, 5, 99)">+</button>`;
      prezzo = prezzoVisibility(serv.quantita) + " € /mese";
      totaleMensile += prezzoVisibility(serv.quantita);
    }
    else if (serv.hasQuantita) {
      const min = 1, max = 99, val = serv.quantita || 1;
      quantitaInput = `${serv.labelQuantita || 'Quantità'}:
      <button type="button" class="btn-qty" onclick="modificaQuantita(${idx}, -1, ${min}, ${max})">-</button>
      <input type="number" min="${min}" max="${max}" value="${val}" style="width:40px;text-align:center;font-size:15px;" onchange="modificaQuantitaDiretta(this.value, ${idx}, ${min}, ${max})" />
      <button type="button" class="btn-qty" onclick="modificaQuantita(${idx}, 1, ${min}, ${max})">+</button>`;
      prezzo = (serv.prezzo * val) + (serv.tipo === "setup" ? " € una tantum" : " € /mese");
      if (serv.tipo === "setup") totaleSetup += serv.prezzo * val;
      else totaleMensile += serv.prezzo * val;
    }
    else {
      quantitaInput = '';
      prezzo = serv.prezzo + (serv.tipo === "setup" ? " € una tantum" : " € /mese");
      if (serv.tipo === "setup") totaleSetup += serv.prezzo;
      else totaleMensile += serv.prezzo;
    }
    card.innerHTML = `<span class="nome">${serv.nome}</span>
    <span style="display:flex; align-items:center; gap:6px;">${quantitaInput}</span>
    <span class="prezzo">${prezzo}</span>
    <button title="Rimuovi" onclick="rimuoviVocePreventivo(${idx})">&times;</button>`;
    dropzone.appendChild(card);
  });
  aggiornaTotali(totaleMensile, totaleSetup);
}
function aggiornaTotali(mensile, setup) {
  document.getElementById('totale-mensile').textContent = mensile + ' €';
  document.getElementById('totale-setup').textContent = setup + ' €';
}

// === MODIFICA QUANTITA' E RIMOZIONE ===
window.modificaQuantita = function(idx, delta, min, max) {
  let serv = serviziSelezionati[idx];
  if (["Starter", "Plus", "VIP"].includes(serv.nome)) {
    let nuovo = (serv.nStanze || 1) + delta;
    if (nuovo < min) nuovo = min;
    if (nuovo > max) nuovo = max;
    serv.nStanze = nuovo;
  } else if (serv.nome === "Visibility MioDottore" || serv.hasQuantita) {
    let nuovo = (serv.quantita || min) + delta;
    if (nuovo < min) nuovo = min;
    if (nuovo > max) nuovo = max;
    serv.quantita = nuovo;
  }
  aggiornaPreventivo();
}
window.modificaQuantitaDiretta = function(val, idx, min, max) {
  let v = parseInt(val) || min;
  if (v < min) v = min;
  if (v > max) v = max;
  let serv = serviziSelezionati[idx];
  if (["Starter", "Plus", "VIP"].includes(serv.nome)) serv.nStanze = v;
  else if (serv.nome === "Visibility MioDottore" || serv.hasQuantita) serv.quantita = v;
  aggiornaPreventivo();
}
window.rimuoviVocePreventivo = function(idx) {
  if (serviziSelezionati[idx].fixed) return;
  serviziSelezionati.splice(idx, 1);
  aggiornaPreventivo();
}

// === DRAG & DROP ===
function setupDragDrop() {
  document.querySelectorAll('.card-servizio').forEach(card => {
    card.addEventListener('dragstart', function(e) {
      const obj = {
        nome: card.dataset.nome,
        prezzo: parseFloat(card.dataset.prezzo),
        tipo: card.dataset.tipo
      };
      if (card.dataset.hasqty === "true") {
        obj.hasQuantita = true;
        obj.labelQuantita = card.dataset.labelqty;
        if (obj.nome === "Visibility MioDottore") obj.quantita = 5;
        else if (obj.nome === "CRM MioDottore") {
          const bundle = serviziSelezionati.find(s => ["Starter", "Plus", "VIP"].includes(s.nome));
          obj.quantita = bundle ? bundle.nStanze : 1;
        }
        else obj.quantita = 1;
      }
      if (["Starter", "Plus", "VIP"].includes(obj.nome)) obj.nStanze = 1;
      e.dataTransfer.setData('text/plain', JSON.stringify(obj));
    });
  });
  const dropzone = document.getElementById('dropzone');
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('over'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('over'));
  dropzone.addEventListener('drop', function(e) {
    e.preventDefault(); dropzone.classList.remove('over');
    let data;
    try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; }
    if (data.nome === "CRM MioDottore") {
      const bundle = serviziSelezionati.find(s => ["Starter", "Plus", "VIP"].includes(s.nome));
      if (!bundle) { alert("Aggiungi prima Starter, Plus o VIP!"); return; }
      data.quantita = bundle.nStanze;
    }
    serviziSelezionati.push(data);
    aggiornaPreventivo();
  });
}

// === DURATA CONTRATTUALE ===
function setupDurata() {
  document.querySelectorAll('input[name="durata"]').forEach(radio => {
    radio.addEventListener('change', function() {
      durata = parseInt(this.value, 10);
      aggiornaPreventivo();
    });
  });
}

// === PROGRESS BAR & PROMO PANEL ===
function aggiornaProgressBar() {
  let bar = document.getElementById('progress-bar-panel');
  if (!progressAttiva) { if (bar) bar.style.display = 'none'; return; }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'progress-bar-panel';
    bar.className = 'progress-bar-panel';
    bar.innerHTML = `
      <div class="progress-title">Verifica delle condizioni riservate in corso...</div>
      <div class="progress-track"><div class="progress-bar" id="progress-bar"></div></div>
      <div class="progress-timer">9 secondi</div>`;
    document.querySelector('.preventivo').appendChild(bar);
  } else bar.style.display = 'block';
}
function startProgressBar(callback) {
  progressAttiva = true; aggiornaProgressBar();
  let bar = document.getElementById('progress-bar');
  let timerTxt = document.querySelector('.progress-timer');
  let duration = 9, elapsed = 0;
  if (timerInterval) clearInterval(timerInterval);
  bar.style.width = '0%';
  timerTxt.textContent = duration + ' secondi';
  timerInterval = setInterval(() => {
    elapsed++;
    bar.style.width = (elapsed / duration * 100) + '%';
    timerTxt.textContent = (duration - elapsed) + ' secondi';
    if (elapsed >= duration) {
      clearInterval(timerInterval);
      progressAttiva = false;
      promoAttiva = true;
      aggiornaPreventivo();
      aggiornaProgressBar();
      if (callback) callback();
    }
  }, 1000);
}

// === PROMO PANEL ===
function aggiornaPromoPanel() {
  let panel = document.getElementById('promo-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'promo-panel';
    panel.style.display = 'none';
    panel.className = 'promo-panel';
    document.querySelector('.preventivo').appendChild(panel);
  }
  if (!promoAttiva) { panel.style.display = 'none'; return; }
  let bundlePromoTxt = '', crmPromoTxt = '', visibilityPromoTxt = '', feePromoTxt = '';
  let totaleMensilePromo = 0, totaleSetupPromo = 0;
  serviziSelezionati.forEach(serv => {
    if (["Starter", "Plus", "VIP"].includes(serv.nome)) {
      let prezzo = prezzoBundlePromo(serv.nome, serv.nStanze || 1);
      bundlePromoTxt += `<div class="promo-voce"><b>${serv.nome} (${serv.nStanze || 1} stanze)</b> <span>${prezzo} € /mese</span> <span class="promo-label">Promo</span></div>`;
      totaleMensilePromo += prezzo;
    }
    else if (serv.nome === "CRM MioDottore") {
      let prezzo = (serv.quantita || 1) * 10;
      crmPromoTxt += `<div class="promo-voce"><b>CRM MioDottore (${serv.quantita} stanze)</b> <span>${prezzo} € /mese</span></div>`;
      totaleMensilePromo += prezzo;
    }
    else if (serv.nome === "Visibility MioDottore") {
      let prezzo = prezzoVisibilityPromo(serv.quantita);
      visibilityPromoTxt += `<div class="promo-voce"><b>Visibility MioDottore (${serv.quantita} medici)</b> <span>${prezzo} € /mese</span> <span class="promo-label">Promo</span></div>`;
      totaleMensilePromo += prezzo;
    }
    else if (serv.fixed && serv.nome === "Attivazione / Formazione") {
      let prezzo = serv.nStanze ? prezzoSetupPromo(serv.nStanze) : '';
      if (prezzo !== '') {
        feePromoTxt += `<div class="promo-voce"><b>${serv.nome}</b> <span>${prezzo} € una tantum</span> <span class="promo-label">Promo</span></div>`;
        totaleSetupPromo += prezzo;
      }
    }
    else if (serv.tipo === "setup") {
      let val = serv.quantita || 1;
      let prezzo = serv.prezzo * val;
      feePromoTxt += `<div class="promo-voce"><b>${serv.nome} (${val} ${serv.labelQuantita || ''})</b> <span>${prezzo} € una tantum</span></div>`;
      totaleSetupPromo += prezzo;
    }
    else if (serv.hasQuantita) {
      let val = serv.quantita || 1;
      let prezzo = serv.prezzo * val;
      feePromoTxt += `<div class="promo-voce"><b>${serv.nome} (${val} ${serv.labelQuantita || ''})</b> <span>${prezzo} € /mese</span></div>`;
      totaleMensilePromo += prezzo;
    }
  });
  let totaleIniziale = 0, setupListino = 0, setupPromo = 0;
  serviziSelezionati.forEach(serv => {
    if (["Starter", "Plus", "VIP"].includes(serv.nome)) {
      const idx = getSogliaIdx(serv.nStanze || 1);
      const base = prezziBundle[serv.nome][idx] * (serv.nStanze || 1);
      totaleIniziale += Math.round(base * 1.3);
    } else if (serv.nome === "CRM MioDottore") {
      const bundle = serviziSelezionati.find(s => ["Starter", "Plus", "VIP"].includes(s.nome));
      totaleIniziale += (bundle ? bundle.nStanze : 1) * 10;
    } else if (serv.nome === "Visibility MioDottore") {
      const unit = getPrezzoVisibility(serv.quantita);
      totaleIniziale += Math.round(unit * serv.quantita * 1.3);
    } else if (serv.fixed && serv.nome === "Attivazione / Formazione") {
      const idx = getSogliaIdx(serv.nStanze || 1);
      setupListino += Math.round(prezziSetup[idx] * 7);
      setupPromo += Math.round(prezziSetup[idx] * 3 * (1 + getPromoPerc()));
    }
  });
  const risparmioPerc = totaleIniziale > 0 ? ((totaleIniziale - totaleMensilePromo) / totaleIniziale * 100) : 0;
  const risparmioSetupPerc = setupListino > 0 ? ((setupListino - setupPromo) / setupListino * 100) : 0;
  const spesaGiornaliera = totaleMensilePromo / 30;

  panel.innerHTML = `
    <div class="promo-title">Offerta Riservata</div>
    <div class="promo-badge promo-badge-duale">
      <span class="badge-main">
        <span>Risparmi <b>${risparmioPerc.toFixed(1)}%</b> <small>canone mensile</small></span>
        <span class="badge-setup">- <b>${risparmioSetupPerc.toFixed(1)}%</b> <small>attivazione</small></span>
      </span>
      <span class="badge-daily">Solo <b>${spesaGiornaliera.toFixed(2)} €</b> al giorno!</span>
    </div>
    ${bundlePromoTxt}
    ${crmPromoTxt}
    ${visibilityPromoTxt}
    ${feePromoTxt}
    <div class="promo-totali" style="margin-top:16px; border-top:1px solid #e5e7eb; padding-top:12px;">
      <div>Totale Mensile Promo: <strong>${totaleMensilePromo} € /mese</strong></div>
      <div>Totale Una Tantum Promo: <strong>${totaleSetupPromo} €</strong></div>
    </div>
    <div class="promo-note">I prezzi promo sono riservati e disponibili solo ora.</div>
  `;
  panel.style.display = (bundlePromoTxt || crmPromoTxt || visibilityPromoTxt || feePromoTxt) ? 'block' : 'none';
  if (panel.style.display === 'block') setTimeout(() => { panel.scrollIntoView({ behavior: 'smooth' }); }, 200);
}

// === BOTTONI E EXPORT ===
function setupAzioni() {
  // Condizioni riservate
  const btnPromo = document.querySelector('.azioni .btn.btn-outline:not(#btn-export-txt):not(#btn-calendar):not(#btn-docusign)');
  if (btnPromo) btnPromo.onclick = function() {
    if (!promoAttiva && !progressAttiva) startProgressBar(() => { promoAttiva = true; aggiornaPreventivo(); });
  };
  // Export
  const btnExport = document.getElementById('btn-export-txt');
  if (btnExport) btnExport.onclick = function(e) {
    e.preventDefault();
    mostraModalExport();
  };
  // Google Calendar
  const btnCalendar = document.getElementById('btn-calendar');
  if (btnCalendar) btnCalendar.onclick = function() {
    const titolo = encodeURIComponent("Appuntamento QPWON");
    const dettagli = encodeURIComponent("Conferma appuntamento per la presentazione del preventivo QPWON.");
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titolo}&details=${dettagli}`;
    window.open(url, '_blank');
  };
  // DocuSign
  const btnDocusign = document.getElementById('btn-docusign');
  if (btnDocusign) btnDocusign.onclick = function() {
    window.open("https://www.docusign.com/it", '_blank');
  };
}

// === INIZIALIZZAZIONE ===
document.addEventListener('DOMContentLoaded', function () {
  setupDragDrop();
  setupDurata();
  setupAzioni();
  aggiornaPreventivo();
});

// === EXPORT TXT (popup con CONTINUA e ANNULLA) ===
function mostraModalExport() {
  if (serviziSelezionati.length === 0) { 
    alert('Aggiungi almeno un servizio al preventivo prima di esportare.');
    return;
  }
  let modal = document.getElementById('modal-export');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-export';
    modal.className = 'modal-export';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Dati per il documento</h2>
        <input type="text" id="export-nome-struttura" placeholder="Nome Struttura" />
        <input type="text" id="export-referente" placeholder="Referente" />
        <input type="email" id="export-mail" placeholder="Email" />
        <input type="text" id="export-tel" placeholder="Telefono" />
        <div style="margin-top: 20px;">
          <button id="btn-export-confirm" class="btn btn-primary">Continua</button>
          <button id="btn-export-close" class="btn btn-outline" style="margin-left: 8px;">Annulla</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    modal.querySelector('#export-nome-struttura').value = "";
    modal.querySelector('#export-referente').value = "";
    modal.querySelector('#export-mail').value = "";
    modal.querySelector('#export-tel').value = "";
  }

  modal.style.display = 'flex';

  document.getElementById('btn-export-close').onclick = function () { modal.style.display = 'none'; }
  document.getElementById('btn-export-confirm').onclick = function () {
    esportaDocumento();
    modal.style.display = 'none';
  }
}

function esportaDocumento() {
  const nomeStruttura = document.getElementById('export-nome-struttura').value || '';
  const referente = document.getElementById('export-referente').value || '';
  const mail = document.getElementById('export-mail').value || '';
  const tel = document.getElementById('export-tel').value || '';

  let txt = `--- PREVENTIVO  ---\n`;
  txt += `Struttura: ${nomeStruttura}\nReferente: ${referente}\nMail: ${mail}\nTelefono: ${tel}\n\n`;
  txt += `SERVIZI SCELTI:\n`;

  serviziSelezionati.forEach(serv => {
    let riga = `- ${serv.nome}`;
    if (serv.nStanze) riga += ` | Stanze: ${serv.nStanze}`;
    if (serv.quantita) riga += ` | Q.tà: ${serv.quantita}`;
    if (serv.fixed && serv.nome === "Attivazione / Formazione") {
      if (serv.nStanze) riga += ` | Prezzo: ${prezzoSetup(serv.nStanze)} € una tantum`;
    } else if (["Starter", "Plus", "VIP"].includes(serv.nome)) {
      if (serv.nStanze) riga += ` | Prezzo: ${prezzoBundle(serv.nome, serv.nStanze)} €/mese`;
    } else if (serv.nome === "CRM MioDottore") {
      if (serv.quantita) riga += ` | Prezzo: ${serv.quantita * 10} €/mese`;
    } else if (serv.nome === "Visibility MioDottore") {
      if (serv.quantita) riga += ` | Prezzo: ${prezzoVisibility(serv.quantita)} €/mese`;
    } else if (serv.tipo === "setup" && serv.quantita) {
      riga += ` | Prezzo: ${serv.prezzo * serv.quantita} € una tantum`;
    } else if (serv.hasQuantita && serv.quantita) {
      riga += ` | Prezzo: ${serv.prezzo * serv.quantita} €/mese`;
    } else if (serv.prezzo) {
      riga += ` | Prezzo: ${serv.prezzo} €`;
    }
    riga += '\n';
    txt += riga;
  });

  // Totali
  const totaleMensile = document.getElementById('totale-mensile').textContent || '';
  const totaleSetup = document.getElementById('totale-setup').textContent || '';
  txt += `\nTotale mensile: ${totaleMensile}\nTotale attivazione: ${totaleSetup}\n`;

  // OFFERTA PROMO SE ATTIVA
  if (promoAttiva) {
    txt += `\n--- OFFERTA RISERVATA (Promo) ---\n`;

    let totaleMensilePromo = 0;
    let totaleSetupPromo = 0;

    serviziSelezionati.forEach(serv => {
      let riga = `- ${serv.nome}`;
      if (serv.nStanze) riga += ` | Stanze: ${serv.nStanze}`;
      if (serv.quantita) riga += ` | Q.tà: ${serv.quantita}`;
      if (["Starter", "Plus", "VIP"].includes(serv.nome)) {
        let prezzo = prezzoBundlePromo(serv.nome, serv.nStanze || 1);
        riga += ` | Prezzo Promo: ${prezzo} €/mese`;
        totaleMensilePromo += prezzo;
      }
      else if (serv.nome === "CRM MioDottore") {
        let prezzo = (serv.quantita || 1) * 10;
        riga += ` | Prezzo Promo: ${prezzo} €/mese`;
        totaleMensilePromo += prezzo;
      }
      else if (serv.nome === "Visibility MioDottore") {
        let prezzo = prezzoVisibilityPromo(serv.quantita);
        riga += ` | Prezzo Promo: ${prezzo} €/mese`;
        totaleMensilePromo += prezzo;
      }
      else if (serv.fixed && serv.nome === "Attivazione / Formazione") {
        let prezzo = serv.nStanze ? prezzoSetupPromo(serv.nStanze) : 0;
        riga += ` | Prezzo Promo: ${prezzo} € una tantum`;
        totaleSetupPromo += prezzo;
      }
      else if (serv.tipo === "setup" && serv.quantita) {
        let prezzo = serv.prezzo * serv.quantita;
        riga += ` | Prezzo Promo: ${prezzo} € una tantum`;
        totaleSetupPromo += prezzo;
      }
      else if (serv.hasQuantita && serv.quantita) {
        let prezzo = serv.prezzo * serv.quantita;
        riga += ` | Prezzo Promo: ${prezzo} €/mese`;
        totaleMensilePromo += prezzo;
      }
      riga += '\n';
      txt += riga;
    });

    // Calcolo risparmio %
    let totaleListino = 0, setupListino = 0, setupPromo = 0;
    serviziSelezionati.forEach(serv => {
      if (["Starter", "Plus", "VIP"].includes(serv.nome)) {
        const idx = getSogliaIdx(serv.nStanze || 1);
        const base = prezziBundle[serv.nome][idx] * (serv.nStanze || 1);
        totaleListino += Math.round(base * 1.3);
      } else if (serv.nome === "CRM MioDottore") {
        const bundle = serviziSelezionati.find(s => ["Starter", "Plus", "VIP"].includes(s.nome));
        totaleListino += (bundle ? bundle.nStanze : 1) * 10;
      } else if (serv.nome === "Visibility MioDottore") {
        const unit = getPrezzoVisibility(serv.quantita);
        totaleListino += Math.round(unit * serv.quantita * 1.3);
      } else if (serv.fixed && serv.nome === "Attivazione / Formazione") {
        const idx = getSogliaIdx(serv.nStanze || 1);
        setupListino += Math.round(prezziSetup[idx] * 7);
        setupPromo += Math.round(prezziSetup[idx] * 3 * (1 + getPromoPerc()));
      }
    });

    const risparmioPerc = totaleListino > 0 ? ((totaleListino - totaleMensilePromo) / totaleListino * 100) : 0;
    const risparmioSetupPerc = setupListino > 0 ? ((setupListino - setupPromo) / setupListino * 100) : 0;
    const spesaGiornaliera = totaleMensilePromo / 30;

    txt += `\nTotale mensile promo: ${totaleMensilePromo} €/mese\n`;
    txt += `Totale attivazione promo: ${totaleSetupPromo} €\n`;
    txt += `Risparmio mensile: ${risparmioPerc.toFixed(1)}%\n`;
    txt += `Risparmio attivazione: ${risparmioSetupPerc.toFixed(1)}%\n`;
    txt += `Spesa giornaliera promo: ${spesaGiornaliera.toFixed(2)} €/giorno\n`;
    txt += `\nNB: Questa offerta riservata è valida solo ora!\n`;
  }

  const blob = new Blob([txt], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Preventivo_QPWON.txt`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
