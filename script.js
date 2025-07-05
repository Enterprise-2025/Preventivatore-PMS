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
// Preventivatore Drag&Drop - completo (promo bundle +18%, export txt, calendar, docusign)
// ===================

// Tabelle prezzi bundle e setup fee
const soglie = [1, 2, 4, 6, 8, 10, 15, 20];
const prezziBundleGipo = {
  Starter: [109, 99, 89, 69, 59, 49, 29, 19],
  Plus:    [144,134,124,104, 84, 74, 64, 54],
  VIP:     [154,144,134,114, 94, 84, 74, 64]
};
const prezziSetupFee = [99,119,129,149,199,299,499,899];

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

// Prezzi maggiorati (listino) e promo (offerta riservata)
function prezzoBundle(nome, nStanze, promo=false) {
  const idx = getSogliaIdx(nStanze);
  const base = prezziBundleGipo[nome][idx] * nStanze;
  // Listino = maggiorazione 30%, Promo = maggiorazione 18%
  return promo ? Math.round(base * 1.18) : Math.round(base * 1.3);
}
function prezzoSetup(nStanze, promo=false) {
  const idx = getSogliaIdx(nStanze);
  const base = prezziSetupFee[idx];
  // Listino = maggiorazione 800%, Promo = maggiorazione 400%
  return promo ? Math.round(base * 5) : Math.round(base * 9);
}
function prezzoVisibility(nMedici, promo=false) {
  const unit = getPrezzoUnitarioVisibility(nMedici);
  // Listino = maggiorazione 30%, Promo = maggiorazione 15%
  return promo
    ? Math.round(unit * nMedici * 1.15)
    : Math.round(unit * nMedici * 1.3);
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
    prezzo: nStanze ? prezzoSetup(nStanze, false) : '',
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

// Render preventivo (carrello: prezzi SEMPRE di listino)
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
        const prezzoTotale = prezzoBundle(serv.nome, serv.nStanze, false);
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
        const prezzoTot = prezzoVisibility(nMedici, false);
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
      dropzone.appendChild(card);
    });
  }

  // Totali di listino (mai scontati)
  let totaleMensile = 0, totaleSetup = 0;
  serviziSelezionati.forEach(serv => {
    if (serv.fixed && serv.prezzo !== '') totaleSetup += parseInt(serv.prezzo);
    else if (serv.tipo === 'bundle') totaleMensile += prezzoBundle(serv.nome, serv.nStanze, false);
    else if (serv.nome === "CRM MioDottore") totaleMensile += (serv.quantita || 1) * 10;
    else if (serv.nome === "Visibility MioDottore") totaleMensile += prezzoVisibility(serv.quantita, false);
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
      promoAttiva = true;
      aggiornaProgressBar();
      if (callback) callback();
    }
  }, 1000);
}

// --- OFFERTA RISERVATA (promo, CRM incluso a prezzo pieno) ---
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

  // Voci promo (SOLO prezzi promo)
  const bundle = serviziSelezionati.find(s => s.tipo === 'bundle');
  const nStanze = bundle ? bundle.nStanze : null;
  let bundlePromoTxt = '';
  let feePromoTxt = '';
  let crmPromoTxt = '';
  let visibilityPromoTxt = '';

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
  const visibility = serviziSelezionati.find(s => s.nome === "Visibility MioDottore");
  if (visibility) {
    let nMedici = visibility.quantita;
    if (nMedici < 5) nMedici = 5;
    if (nMedici > 99) nMedici = 99;
    const prezzoTot = prezzoVisibility(nMedici, true);
    visibilityPromoTxt = `<div class="promo-voce"><b>Visibility MioDottore</b> <span>${prezzoTot} € /mese</span> <span class="promo-label">Promo</span></div>`;
  }
  const crm = serviziSelezionati.find(s => s.nome === "CRM MioDottore");
  if (crm) {
    crmPromoTxt = `<div class="promo-voce"><b>CRM MioDottore</b> <span>${(crm.quantita || 1) * 10} € /mese</span></div>`;
  }

  // Totali PROMO (bundle+visibility scontati, crm a prezzo pieno, attivazione promo)
  let totaleMensilePromo = 0, totaleSetupPromo = 0;
  if (bundle) totaleMensilePromo += prezzoBundle(bundle.nome, nStanze, true);
  if (visibility) totaleMensilePromo += prezzoVisibility(visibility.quantita, true);
  if (crm) totaleMensilePromo += (crm.quantita || 1) * 10;
  if (fee && nStanze) totaleSetupPromo += prezzoSetup(nStanze, true);

  panel.innerHTML = `
    <div class="promo-title">Offerta Riservata</div>
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
  if (panel.style.display === 'block') setTimeout(()=>{ panel.scrollIntoView({behavior:'smooth'}); },200);
}

// QUANTITÀ (bundle, visibility)
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
  }
  aggiornaPreventivo();
};
window.rimuoviVocePreventivo = function(idx) {
  if (serviziSelezionati[idx].fixed) return;
  serviziSelezionati.splice(idx, 1);
  aggiornaPreventivo();
};

// DRAG & DROP
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
  aggiornaPreventivo();
});

// --- BOTTONI ---
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
    } else if (txt === "Esporta documento") {
      mostraModalExport();
    }
  });
});

// Google Calendar
document.getElementById('btn-calendar').onclick = function() {
  const titolo = encodeURIComponent("Appuntamento QPWON");
  const dettagli = encodeURIComponent("Conferma appuntamento per la presentazione del preventivo QPWON.");
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titolo}&details=${dettagli}`;
  window.open(url, '_blank');
};
// DocuSign
document.getElementById('btn-docusign').onclick = function() {
  window.open("https://www.docusign.com/it", '_blank'); // Sostituisci con il TUO link!
};

// MODAL EXPORT TXT
function mostraModalExport() {
  if (document.getElementById('export-modal')) return;
  let modal = document.createElement('div');
  modal.id = 'export-modal';
  modal.style.cssText = `
    position:fixed; left:0;top:0;width:100vw;height:100vh;z-index:99;background:#0007;display:flex;align-items:center;justify-content:center;
  `;
  modal.innerHTML = `
    <div style="background:#fff;padding:32px 24px 18px 24px;border-radius:13px;box-shadow:0 8px 32px #0004;min-width:320px;max-width:90vw;">
      <h3 style="margin-bottom:12px;">Esporta Documento</h3>
      <label>Nome struttura<br><input id="ex_nome" type="text" style="width:100%;margin-bottom:8px;" /></label><br>
      <label>Referente<br><input id="ex_ref" type="text" style="width:100%;margin-bottom:8px;" /></label><br>
      <label>Email<br><input id="ex_mail" type="email" style="width:100%;margin-bottom:8px;" /></label><br>
      <label>Telefono<br><input id="ex_tel" type="text" style="width:100%;margin-bottom:14px;" /></label><br>
      <div style="text-align:right;margin-top:8px;">
        <button onclick="document.getElementById('export-modal').remove()" style="margin-right:15px;">Annulla</button>
        <button id="export-continua-btn" style="background:#009ca6;color:#fff;padding:7px 19px;border-radius:6px;border:none;font-weight:600;">Continua</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('export-continua-btn').onclick = function() {
    const nome = document.getElementById('ex_nome').value.trim();
    const ref  = document.getElementById('ex_ref').value.trim();
    const mail = document.getElementById('ex_mail').value.trim();
    const tel  = document.getElementById('ex_tel').value.trim();
    if (!nome || !ref || !mail || !tel) {
      alert('Compila tutti i campi!');
      return;
    }
    modal.remove();
    esportaPreventivoTXT({ nome, ref, mail, tel });
  };
}

// GENERAZIONE E DOWNLOAD DEL TXT
function esportaPreventivoTXT(dati) {
  let txt = '';
  txt += `Preventivo per struttura: ${dati.nome}\n`;
  txt += `Referente: ${dati.ref}\n`;
  txt += `Email: ${dati.mail}\n`;
  txt += `Telefono: ${dati.tel}\n`;
  txt += `Data esportazione: ${new Date().toLocaleString()}\n`;
  txt += `---------------------------------------\n\n`;

  txt += `SERVIZI SELEZIONATI - PREZZI DI LISTINO\n`;
  serviziSelezionati.forEach(serv => {
    if (serv.tipo === 'bundle') {
      txt += `- ${serv.nome} (${serv.nStanze} stanze): ${prezzoBundle(serv.nome, serv.nStanze, false)} €/mese\n`;
    } else if (serv.nome === 'CRM MioDottore') {
      txt += `- CRM MioDottore (${serv.quantita} stanze): ${serv.quantita * 10} €/mese\n`;
    } else if (serv.nome === 'Visibility MioDottore') {
      txt += `- Visibility MioDottore (${serv.quantita} medici): ${prezzoVisibility(serv.quantita, false)} €/mese\n`;
    } else if (serv.fixed && serv.prezzo !== '') {
      txt += `- ${serv.nome}: ${serv.prezzo} € una tantum\n`;
    }
  });
  let totaleMensile = 0, totaleSetup = 0;
  serviziSelezionati.forEach(serv => {
    if (serv.fixed && serv.prezzo !== '') totaleSetup += parseInt(serv.prezzo);
    else if (serv.tipo === 'bundle') totaleMensile += prezzoBundle(serv.nome, serv.nStanze, false);
    else if (serv.nome === "CRM MioDottore") totaleMensile += (serv.quantita || 1) * 10;
    else if (serv.nome === "Visibility MioDottore") totaleMensile += prezzoVisibility(serv.quantita, false);
  });
  txt += `\nTotale canone mensile (listino): ${totaleMensile} €\n`;
  txt += `Totale una tantum (listino): ${totaleSetup} €\n`;

  txt += `\n---------------------------------------\n`;

  if (promoAttiva) {
    txt += `\nOFFERTA RISERVATA (PROMO):\n`;

    const bundle = serviziSelezionati.find(s => s.tipo === 'bundle');
    const nStanze = bundle ? bundle.nStanze : null;
    if (bundle) txt += `- ${bundle.nome} (${nStanze} stanze): ${prezzoBundle(bundle.nome, nStanze, true)} €/mese (promo)\n`;
    const crm = serviziSelezionati.find(s => s.nome === 'CRM MioDottore');
    if (crm) txt += `- CRM MioDottore (${crm.quantita} stanze): ${crm.quantita * 10} €/mese\n`;
    const visibility = serviziSelezionati.find(s => s.nome === 'Visibility MioDottore');
    if (visibility) txt += `- Visibility MioDottore (${visibility.quantita} medici): ${prezzoVisibility(visibility.quantita, true)} €/mese (promo)\n`;
    const fee = serviziSelezionati.find(s => s.fixed && nStanze);
    if (fee) txt += `- ${fee.nome}: ${prezzoSetup(nStanze, true)} € una tantum (promo)\n`;

    let totaleMensilePromo = 0, totaleSetupPromo = 0;
    if (bundle) totaleMensilePromo += prezzoBundle(bundle.nome, nStanze, true);
    if (crm) totaleMensilePromo += (crm.quantita || 1) * 10;
    if (visibility) totaleMensilePromo += prezzoVisibility(visibility.quantita, true);
    if (fee && nStanze) totaleSetupPromo += prezzoSetup(nStanze, true);

    txt += `\nTotale canone mensile promo: ${totaleMensilePromo} €\n`;
    txt += `Totale una tantum promo: ${totaleSetupPromo} €\n`;
  }

  txt += `\n---------------------------------------\n`;
  txt += `Documento generato con QPWON Preventivatore\n`;

  const blob = new Blob([txt], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'preventivo.txt';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// Prima render
aggiornaPreventivo();


