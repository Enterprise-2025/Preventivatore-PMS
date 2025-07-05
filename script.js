// ✅ Protezione accesso
(function protezioneAccesso() {
  const refOk = document.referrer.includes("enterprise-2025.github.io") || window.opener;
  const accessoConsentito = localStorage.getItem("accesso_consentito") === "ok";
  if (!accessoConsentito || !refOk) {
    document.body.innerHTML = "<h2 style='color: red; text-align: center;'>Accesso non autorizzato</h2>";
    setTimeout(() => location.replace("https://enterprise-2025.github.io/"), 1500);
  }
})();

// ===================
// Preventivatore Drag&Drop - Completo, DRAG&DROP Funzionante
// ===================

// Tabelle prezzi bundle e setup fee
const soglie = [1, 2, 4, 6, 8, 10, 15, 20];
const prezziBundleGipo = {
  Starter: [109, 99, 89, 69, 59, 49, 29, 19],
  Plus:    [144,134,124,104, 84, 74, 64, 54],
  VIP:     [154,144,134,114, 94, 84, 74, 64]
};
const prezziSetupFee = [99,119,129,149,199,299,499,899];

// Fasce visibility MioDottore
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
function getPrezzoUnitarioVisibility(nMedici) {
  for(const f of visibilityFasce) {
    if(nMedici >= f.min && nMedici <= f.max) return f.prezzo;
  }
  return 0;
}

function getSogliaIdx(nStanze) {
  for (let i=0; i<soglie.length; i++) {
    if (nStanze <= soglie[i]) return i;
  }
  return soglie.length-1;
}

// Prezzo bundle/setup fee (con maggiorazioni/promo)
function prezzoBundle(bundle, nStanze, promo=false) {
  if (!bundle || !nStanze) return '';
  const idx = getSogliaIdx(nStanze);
  const base = prezziBundleGipo[bundle][idx] * nStanze;
  return promo ? Math.round(base * 1.15) : Math.round(base * 1.3);
}
function prezzoSetup(nStanze, promo=false) {
  if (!nStanze) return '';
  const idx = getSogliaIdx(nStanze);
  const base = prezziSetupFee[idx];
  return promo ? Math.round(base * 4.7) : Math.round(base * 6.7);
}

// Stato
let serviziSelezionati = [];
let promoAttiva = false;
let progressAttiva = false;
let timerInterval = null;

// Setup fee fissa (sempre in testa)
function aggiornaSetupFee() {
  const bundle = serviziSelezionati.find(s => s.tipo === "bundle");
  const nStanze = bundle ? bundle.nStanze : null;
  const idx = serviziSelezionati.findIndex(s => s.fixed);

  const feeObj = {
    nome: "Attivazione / Formazione",
    prezzo: nStanze ? prezzoSetup(nStanze, promoAttiva) : '',
    tipo: "setup",
    fixed: true,
    nStanze: nStanze
  };

  if (idx === -1) {
    serviziSelezionati.unshift(feeObj);
  } else {
    serviziSelezionati[idx] = feeObj;
  }
}

// Render preventivo
function aggiornaPreventivo() {
  aggiornaSetupFee();

  const dropzone = document.getElementById('dropzone');
  dropzone.innerHTML = '';
  if (serviziSelezionati.length === 0) {
    dropzone.innerHTML = '<p style="color:#94a3b8;margin:0;">Trascina qui i servizi che vuoi attivare</p>';
  } else {
    serviziSelezionati.forEach((serv, idx) => {
      let card;
      // Setup fee (fissa)
      if (serv.fixed) {
        card = document.createElement('div');
        card.className = 'voce-preventivo';
        card.innerHTML = `
          <span class="nome">${serv.nome}</span>
          <span class="prezzo">${serv.prezzo !== '' ? serv.prezzo + ' € una tantum' : '<span style="color:#bbb">—</span>'}</span>
        `;
      }
      // Bundle GIPO
      else if (serv.tipo === 'bundle') {
        const prezzoTotale = prezzoBundle(serv.nome, serv.nStanze, promoAttiva);
        card = document.createElement('div');
        card.className = 'voce-preventivo bundle-card';
        card.innerHTML = `
          <span class="nome">${serv.nome}</span>
          <span style="display: flex; align-items: center; gap: 6px;">
            Stanze:
            <button type="button" class="btn-qty" onclick="modificaQuantita(${idx}, -1)">-</button>
            <input type="number" min="1" max="20" value="${serv.nStanze}" style="width:40px;text-align:center;font-size:15px;" onchange="modificaQuantitaDiretta(this.value, ${idx})" />
            <button type="button" class="btn-qty" onclick="modificaQuantita(${idx}, 1)">+</button>
          </span>
          <span class="prezzo">${prezzoTotale} € /mese</span>
          <button title="Rimuovi" onclick="rimuoviVocePreventivo(${idx})">&times;</button>
        `;
      }
      // CRM MioDottore
      else if (serv.nome === "CRM MioDottore") {
        const bundle = serviziSelezionati.find(s => s.tipo === 'bundle');
        const nStanze = bundle ? bundle.nStanze : 1;
        serv.quantita = nStanze;
        const prezzoTot = serv.quantita * 10;
        card = document.createElement('div');
        card.className = 'voce-preventivo';
        card.innerHTML = `
          <span class="nome">${serv.nome}</span>
          <span style="display: flex; align-items: center; gap: 6px;">
            Stanze: <input type="number" min="1" max="20" value="${serv.quantita}" readonly style="width:40px;text-align:center;font-size:15px; background:#f3f4f6; border:none;" />
          </span>
          <span class="prezzo">${prezzoTot} € /mese</span>
          <button title="Rimuovi" onclick="rimuoviVocePreventivo(${idx})">&times;</button>
        `;
      }
      // Visibility MioDottore
      else if (serv.nome === "Visibility MioDottore") {
        let nMedici = serv.quantita;
        if (nMedici < 5) nMedici = 5;
        if (nMedici > 99) nMedici = 99;
        serv.quantita = nMedici;
        const prezzoUnit = getPrezzoUnitarioVisibility(nMedici);
        const prezzoBase = prezzoUnit * nMedici;
        const maggiorazione = promoAttiva ? 1.15 : 1.3;
        const prezzoTot = Math.round(prezzoBase * maggiorazione);
        card = document.createElement('div');
        card.className = 'voce-preventivo';
        card.innerHTML = `
          <span class="nome">${serv.nome}</span>
          <span style="display: flex; align-items: center; gap: 6px;">
            Medici:
            <button type="button" class="btn-qty" onclick="modificaQuantita(${idx}, -1, 5, 99)">-</button>
            <input type="number" min="5" max="99" value="${serv.quantita}" style="width:44px;text-align:center;font-size:15px;" onchange="modificaQuantitaDiretta(this.value, ${idx}, 5, 99)" />
            <button type="button" class="btn-qty" onclick="modificaQuantita(${idx}, 1, 5, 99)">+</button>
          </span>
          <span class="prezzo">${prezzoTot} € /mese</span>
          <button title="Rimuovi" onclick="rimuoviVocePreventivo(${idx})">&times;</button>
        `;
      }
      // Add-on a quantità
      else if (serv.hasQuantita) {
        const prezzoTot = serv.prezzo * serv.quantita;
        card = document.createElement('div');
        card.className = 'voce-preventivo';
        card.innerHTML = `
          <span class="nome">${serv.nome}</span>
          <span style="display: flex; align-items: center; gap: 6px;">
            ${serv.labelQuantita}:
            <button type="button" class="btn-qty" onclick="modificaQuantita(${idx}, -1)">-</button>
            <input type="number" min="1" max="50" value="${serv.quantita}" style="width:40px;text-align:center;font-size:15px;" onchange="modificaQuantitaDiretta(this.value, ${idx})" />
            <button type="button" class="btn-qty" onclick="modificaQuantita(${idx}, 1)">+</button>
          </span>
          <span class="prezzo">${prezzoTot} € /mese</span>
          <button title="Rimuovi" onclick="rimuoviVocePreventivo(${idx})">&times;</button>
        `;
      }
      // Moduli standard
      else {
        card = document.createElement('div');
        card.className = 'voce-preventivo';
        card.innerHTML = `
          <span class="nome">${serv.nome}</span>
          <span class="prezzo">${serv.prezzo} € ${serv.tipo === 'setup' ? 'una tantum' : '/mese'}</span>
          <button title="Rimuovi" onclick="rimuoviVocePreventivo(${idx})">&times;</button>
        `;
      }
      dropzone.appendChild(card);
    });
  }

  // Totali principali
  let totaleMensile = 0, totaleSetup = 0;
  serviziSelezionati.forEach(serv => {
    if (serv.fixed && serv.prezzo !== '') totaleSetup += parseInt(serv.prezzo);
    else if (serv.tipo === 'bundle' && prezzoBundle(serv.nome, serv.nStanze, promoAttiva) !== '') {
      totaleMensile += prezzoBundle(serv.nome, serv.nStanze, promoAttiva);
    } else if (serv.nome === "CRM MioDottore") {
      totaleMensile += (serv.quantita || 1) * 10;
    } else if (serv.nome === "Visibility MioDottore") {
      const nMedici = serv.quantita;
      const prezzoUnit = getPrezzoUnitarioVisibility(nMedici);
      const prezzoBase = prezzoUnit * nMedici;
      const maggiorazione = promoAttiva ? 1.15 : 1.3;
      const prezzoTot = Math.round(prezzoBase * maggiorazione);
      totaleMensile += prezzoTot;
    } else if (serv.hasQuantita) {
      totaleMensile += serv.prezzo * serv.quantita;
    } else if (serv.tipo === 'mensile') {
      totaleMensile += serv.prezzo;
    } else if (serv.tipo === 'setup') {
      totaleSetup += serv.prezzo;
    }
  });
  document.getElementById('totale-mensile').textContent = totaleMensile + ' €';
  document.getElementById('totale-setup').textContent = totaleSetup + ' €';

  aggiornaProgressBar();
  aggiornaPromoPanel();
}

// --- PROGRESS BAR OFFERTA RISERVATA ---
function aggiornaProgressBar() {
  let bar = document.getElementById('progress-bar-panel');
  if (!progressAttiva) {
    if (bar) bar.style.display = 'none';
    return;
  }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'progress-bar-panel';
    bar.className = 'progress-bar-panel';
    bar.innerHTML = `
      <div class="progress-title">Verifica delle condizioni riservate in corso...</div>
      <div class="progress-track">
        <div class="progress-bar" id="progress-bar"></div>
      </div>
      <div class="progress-timer">9 secondi</div>
    `;
    document.querySelector('.preventivo').appendChild(bar);
  } else {
    bar.style.display = 'block';
  }
}
function startProgressBar(callback) {
  progressAttiva = true;
  aggiornaProgressBar();

  let bar = document.getElementById('progress-bar');
  let timerTxt = document.querySelector('.progress-timer');
  let duration = 9; // secondi
  let elapsed = 0;
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
      aggiornaProgressBar();
      if (callback) callback();
    }
  }, 1000);
}

// --- OFFERTA RISERVATA (pannello promo) ---
function aggiornaPromoPanel() {
  let panel = document.getElementById('promo-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'promo-panel';
    panel.style.display = 'none';
    panel.className = 'promo-panel';
    document.querySelector('.preventivo').appendChild(panel);
  }
  if (!promoAttiva) {
    panel.style.display = 'none';
    return;
  }
  // Bundle/fee in versione promo
  const bundle = serviziSelezionati.find(s => s.tipo === 'bundle');
  const nStanze = bundle ? bundle.nStanze : null;
  let bundlePromoTxt = '';
  let feePromoTxt = '';
  if (bundle) {
    const prezzo = prezzoBundle(bundle.nome, nStanze, true);
    bundlePromoTxt = `<div class="promo-voce"><b>${bundle.nome}</b> <span>${prezzo} € /mese</span> <span class="promo-label">Promo</span></div>`;
  }
  const fee = serviziSelezionati.find(s => s.fixed);
  if (fee && nStanze) {
    const prezzo = prezzoSetup(nStanze, true);
    feePromoTxt = `<div class="promo-voce"><b>${fee.nome}</b> <span>${prezzo} € una tantum</span> <span class="promo-label">Promo</span></div>`;
  } else if (fee) {
    feePromoTxt = `<div class="promo-voce"><b>${fee.nome}</b> <span style="color:#bbb">—</span></div>`;
  }
  // Visibility MioDottore in promo
  let visibilityPromoTxt = '';
  const visibility = serviziSelezionati.find(s => s.nome === "Visibility MioDottore");
  if (visibility) {
    let nMedici = visibility.quantita;
    if (nMedici < 5) nMedici = 5;
    if (nMedici > 99) nMedici = 99;
    const prezzoUnit = getPrezzoUnitarioVisibility(nMedici);
    const prezzoBase = prezzoUnit * nMedici;
    const prezzoTot = Math.round(prezzoBase * 1.15);
    visibilityPromoTxt = `<div class="promo-voce"><b>Visibility MioDottore</b> <span>${prezzoTot} € /mese</span> <span class="promo-label">Promo</span></div>`;
  }

  panel.innerHTML = `
    <div class="promo-title">Offerta Riservata</div>
    ${bundlePromoTxt}
    ${feePromoTxt}
    ${visibilityPromoTxt}
    <div class="promo-note">I prezzi promo sono riservati e disponibili solo ora.</div>
  `;
  panel.style.display = (bundlePromoTxt || feePromoTxt || visibilityPromoTxt) ? 'block' : 'none';
  if (panel.style.display === 'block') setTimeout(()=>{ panel.scrollIntoView({behavior:'smooth'}); },200);
}

// --- QUANTITÀ (bundle, visibility, add-on)
window.modificaQuantita = function(idx, delta, min=1, max=50) {
  let serv = serviziSelezionati[idx];
  if (serv.tipo === 'bundle') {
    let nuovo = serv.nStanze + delta;
    if (nuovo < 1) nuovo = 1;
    if (nuovo > 20) nuovo = 20;
    serv.nStanze = nuovo;
    const crm = serviziSelezionati.find(s => s.nome === "CRM MioDottore");
    if (crm) crm.quantita = nuovo;
  } else if (serv.nome === "Visibility MioDottore") {
    let nuovo = serv.quantita + delta;
    if (nuovo < 5) nuovo = 5;
    if (nuovo > 99) nuovo = 99;
    serv.quantita = nuovo;
  } else if (serv.hasQuantita) {
    let nuovo = serv.quantita + delta;
    if (nuovo < min) nuovo = min;
    if (nuovo > max) nuovo = max;
    serv.quantita = nuovo;
  }
  aggiornaPreventivo();
};
window.modificaQuantitaDiretta = function(val, idx, min=1, max=50) {
  let serv = serviziSelezionati[idx];
  let nuovo = parseInt(val) || min;
  if (serv.tipo === 'bundle') {
    if (nuovo < 1) nuovo = 1;
    if (nuovo > 20) nuovo = 20;
    serv.nStanze = nuovo;
    const crm = serviziSelezionati.find(s => s.nome === "CRM MioDottore");
    if (crm) crm.quantita = nuovo;
  } else if (serv.nome === "Visibility MioDottore") {
    if (nuovo < 5) nuovo = 5;
    if (nuovo > 99) nuovo = 99;
    serv.quantita = nuovo;
  } else if (serv.hasQuantita) {
    if (nuovo < min) nuovo = min;
    if (nuovo > max) nuovo = max;
    serv.quantita = nuovo;
  }
  aggiornaPreventivo();
};
window.rimuoviVocePreventivo = function(idx) {
  if (serviziSelezionati[idx].fixed) return;
  serviziSelezionati.splice(idx, 1);
  aggiornaPreventivo();
};

// --- DRAG & DROP ---
document.querySelectorAll('.card-servizio').forEach(card => {
  card.addEventListener('dragstart', function (e) {
    e.dataTransfer.effectAllowed = "copy";
    const obj = {
      nome: card.dataset.nome,
      prezzo: parseFloat(card.dataset.prezzo),
      tipo: card.dataset.tipo
    };
    if (card.dataset.hasqty === "true") {
      obj.hasQuantita = true;
      obj.labelQuantita = card.dataset.labelqty;
      obj.quantita = obj.nome === "Visibility MioDottore" ? 5 : 1;
    }
    e.dataTransfer.setData('text/plain', JSON.stringify(obj));
  });
});
const dropzone = document.getElementById('dropzone');
dropzone.addEventListener('dragover', function (e) {
  e.preventDefault();
  dropzone.classList.add('over');
});
dropzone.addEventListener('dragleave', function (e) {
  dropzone.classList.remove('over');
});
dropzone.addEventListener('drop', function (e) {
  e.preventDefault();
  dropzone.classList.remove('over');
  let data;
  try {
    data = JSON.parse(e.dataTransfer.getData('text/plain'));
  } catch {
    return;
  }
  // Solo un bundle GIPO alla volta
  if (["Starter", "Plus", "VIP"].includes(data.nome)) {
    serviziSelezionati = serviziSelezionati.filter(s => s.tipo !== "bundle" && !s.fixed);
    serviziSelezionati.unshift({
      nome: "Attivazione / Formazione",
      prezzo: '',
      tipo: "setup",
      fixed: true,
      nStanze: null
    });
    serviziSelezionati.push({
      nome: data.nome,
      tipo: "bundle",
      nStanze: 1
    });
    const crm = serviziSelezionati.find(s => s.nome === "CRM MioDottore");
    if (crm) crm.quantita = 1;
    aggiornaPreventivo();
    return;
  }
  // CRM MioDottore: quantità = stanze bundle
  if (data.nome === "CRM MioDottore") {
    if (serviziSelezionati.some(s => s.nome === "CRM MioDottore")) return;
    const bundle = serviziSelezionati.find(s => s.tipo === 'bundle');
    const nStanze = bundle ? bundle.nStanze : 1;
    serviziSelezionati.push({
      nome: "CRM MioDottore",
      prezzo: 10,
      tipo: "mensile",
      hasQuantita: true,
      labelQuantita: "Stanze",
      quantita: nStanze
    });
    aggiornaPreventivo();
    return;
  }
  // Visibility MioDottore
  if (data.nome === "Visibility MioDottore") {
    if (serviziSelezionati.some(s => s.nome === "Visibility MioDottore")) return;
    serviziSelezionati.push({
      nome: "Visibility MioDottore",
      prezzo: 0,
      tipo: "mensile",
      hasQuantita: true,
      labelQuantita: "Medici",
      quantita: 5
    });
    aggiornaPreventivo();
    return;
  }
  // No doppioni
  if (serviziSelezionati.some(s => s.nome === data.nome)) return;
  // Add-on a quantità
  if (data.hasQuantita) {
    serviziSelezionati.push({
      nome: data.nome,
      prezzo: data.prezzo,
      tipo: data.tipo,
      hasQuantita: true,
      labelQuantita: data.labelQuantita || data.labelqty || "",
      quantita: 1
    });
  } else {
    // Modulo standard
    serviziSelezionati.push({
      nome: data.nome,
      prezzo: data.prezzo,
      tipo: data.tipo
    });
  }
  aggiornaPreventivo();
});

// --- BOTTONI
document.querySelectorAll('.azioni .btn').forEach(btn => {
  btn.addEventListener('click', function () {
    const txt = btn.textContent.trim();
    if (txt === "Verifica condizioni riservate") {
      if (!promoAttiva && !progressAttiva) {
        startProgressBar(function() {
          promoAttiva = true;
          aggiornaPreventivo();
        });
      }
    } else if (txt === "Genera PDF") {
      alert("Simulazione: generazione PDF.");
    } else if (txt === "Procedi") {
      alert("Simulazione: procedi.");
    }
  });
});

// Prima render
aggiornaPreventivo();

