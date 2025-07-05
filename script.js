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
// Preventivatore Drag&Drop - Bundle e Setup: logica maggiorazioni listino/promo
// ===================

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

// FUNZIONE PREZZO BUNDLE
function prezzoBundle(nome, nStanze, promo=false) {
  const idx = getSogliaIdx(nStanze);
  const base = prezziBundleGipo[nome][idx] * nStanze;
  if (promo) {
    return Math.round(base * 1.15); // promo: maggiorazione 15%
  } else {
    return Math.round(base * 1.3);  // listino: maggiorazione 30%
  }
}

// FUNZIONE PREZZO SETUP
function prezzoSetup(nStanze, promo=false) {
  const idx = getSogliaIdx(nStanze);
  const base = prezziSetupFee[idx];
  if (promo) {
    return base * 3; // promo: x3
  } else {
    return base * 7; // listino: x7
  }
}

function prezzoVisibility(nMedici, promo=false) {
  const unit = getPrezzoUnitarioVisibility(nMedici);
  return promo
    ? Math.round(unit * nMedici * 1.15)
    : Math.round(unit * nMedici * 1.3);
}

let serviziSelezionati = [];
let promoAttiva = false;
let progressAttiva = false;
let timerInterval = null;

function aggiornaSetupFee() {
  const primoBundle = serviziSelezionati.find(s => ["Starter","Plus","VIP"].includes(s.nome));
  const nStanze = primoBundle ? primoBundle.nStanze : null;
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

function aggiornaPreventivo() {
  aggiornaSetupFee();
  sincronizzaCRM();

  const dropzone = document.getElementById('dropzone');
  dropzone.innerHTML = '';
  if (serviziSelezionati.length === 0) {
    dropzone.innerHTML = '<p style="color:#94a3b8;margin:0;">Trascina qui i servizi che vuoi attivare</p>';
  } else {
    serviziSelezionati.forEach((serv, idx) => {
      let card = document.createElement('div');
      card.className = 'voce-preventivo';
      let quantitaInput = '';
      let prezzo = '';

      // Attivazione/Formazione (non rimuovibile)
      if (serv.fixed) {
        card.innerHTML = `
          <span class="nome">${serv.nome}</span>
          <span class="prezzo">${serv.prezzo !== '' ? serv.prezzo + ' € una tantum' : '<span style="color:#bbb">—</span>'}</span>
        `;
        dropzone.appendChild(card);
        return;
      }

      // Bundle (Starter/Plus/VIP)
      if (["Starter","Plus","VIP"].includes(serv.nome)) {
        prezzo = prezzoBundle(serv.nome, serv.nStanze, false);
        quantitaInput = `
          Stanze:
          <button type="button" class="btn-qty" onclick="modificaQuantita(${idx}, -1, 1, 20)">-</button>
          <input type="number" min="1" max="20" value="${serv.nStanze}" style="width:40px;text-align:center;font-size:15px;" onchange="modificaQuantitaDiretta(this.value, ${idx}, 1, 20)" />
          <button type="button" class="btn-qty" onclick="modificaQuantita(${idx}, 1, 1, 20)">+</button>
        `;
        prezzo += " € /mese";
      }
      // CRM MioDottore - quantita SEMPRE uguale a bundle, non editabile!
      else if (serv.nome === "CRM MioDottore") {
        const bundle = serviziSelezionati.find(s => ["Starter","Plus","VIP"].includes(s.nome));
        const nStanze = bundle ? bundle.nStanze : 1;
        serv.quantita = nStanze;
        quantitaInput = `Stanze: <input type="number" value="${nStanze}" readonly style="width:40px;text-align:center;font-size:15px;background:#f1f5f9;pointer-events:none;" />`;
        prezzo = (serv.quantita * 10) + " € /mese";
      }
      // Visibility MioDottore (gestione quantità medici)
      else if (serv.nome === "Visibility MioDottore") {
        quantitaInput = `
          Medici:
          <button type="button" class="btn-qty" onclick="modificaQuantita(${idx}, -1, 5, 99)">-</button>
          <input type="number" min="5" max="99" value="${serv.quantita}" style="width:44px;text-align:center;font-size:15px;" onchange="modificaQuantitaDiretta(this.value, ${idx}, 5, 99)" />
          <button type="button" class="btn-qty" onclick="modificaQuantita(${idx}, 1, 5, 99)">+</button>
        `;
        prezzo = prezzoVisibility(serv.quantita, false) + " € /mese";
      }
      // Moduli con quantità generica
      else if (serv.hasQuantita) {
        const min = 1;
        const max = 99;
        const val = serv.quantita || 1;
        quantitaInput = `
          ${serv.labelQuantita || 'Quantità'}:
          <button type="button" class="btn-qty" onclick="modificaQuantita(${idx}, -1, ${min}, ${max})">-</button>
          <input type="number" min="${min}" max="${max}" value="${val}" style="width:40px;text-align:center;font-size:15px;" onchange="modificaQuantitaDiretta(this.value, ${idx}, ${min}, ${max})" />
          <button type="button" class="btn-qty" onclick="modificaQuantita(${idx}, 1, ${min}, ${max})">+</button>
        `;
        prezzo = (serv.prezzo * val) + (serv.tipo === "setup" ? " € una tantum" : " € /mese");
      }
      // Altri prodotti (quantità singola)
      else {
        quantitaInput = '';
        prezzo = serv.prezzo + (serv.tipo === "setup" ? " € una tantum" : " € /mese");
      }
      card.innerHTML = `
        <span class="nome">${serv.nome}</span>
        <span style="display:flex; align-items:center; gap:6px;">${quantitaInput}</span>
        <span class="prezzo">${prezzo}</span>
        <button title="Rimuovi" onclick="rimuoviVocePreventivo(${idx})">&times;</button>
      `;
      dropzone.appendChild(card);
    });
  }

  // Totali
  let totaleMensile = 0, totaleSetup = 0;
  serviziSelezionati.forEach(serv => {
    if (serv.fixed && serv.prezzo !== '') totaleSetup += parseInt(serv.prezzo);
    else if (["Starter","Plus","VIP"].includes(serv.nome)) totaleMensile += prezzoBundle(serv.nome, serv.nStanze, false);
    else if (serv.nome === "CRM MioDottore") totaleMensile += (serv.quantita || 1) * 10;
    else if (serv.nome === "Visibility MioDottore") totaleMensile += prezzoVisibility(serv.quantita, false);
    else if (serv.hasQuantita) {
      if (serv.tipo === "setup") totaleSetup += serv.prezzo * (serv.quantita || 1);
      else totaleMensile += serv.prezzo * (serv.quantita || 1);
    }
    else if (serv.tipo === "setup") totaleSetup += serv.prezzo;
    else totaleMensile += serv.prezzo;
  });
  document.getElementById('totale-mensile').textContent = totaleMensile + ' €';
  document.getElementById('totale-setup').textContent = totaleSetup + ' €';

  aggiornaProgressBar();
  aggiornaPromoPanel();
}

// Sincronizza CRM con bundle (aggiunto, modificato, rimosso)
function sincronizzaCRM() {
  const bundle = serviziSelezionati.find(s => ["Starter","Plus","VIP"].includes(s.nome));
  let crmIdx = serviziSelezionati.findIndex(s => s.nome === "CRM MioDottore");
  if (!bundle && crmIdx !== -1) {
    // Se non c'è bundle, rimuovi CRM
    serviziSelezionati.splice(crmIdx, 1);
  } else if (bundle && crmIdx !== -1) {
    // Se c'è, aggiorna la quantità!
    serviziSelezionati[crmIdx].quantita = bundle.nStanze;
  }
}

window.modificaQuantita = function(idx, delta, min, max) {
  let serv = serviziSelezionati[idx];
  if (["Starter","Plus","VIP"].includes(serv.nome)) {
    let nuovo = serv.nStanze + delta;
    if (nuovo < min) nuovo = min;
    if (nuovo > max) nuovo = max;
    serv.nStanze = nuovo;
    aggiornaPreventivo(); // aggiorna tutto, anche CRM!
    return;
  }
  else if (serv.nome === "Visibility MioDottore") {
    let nuovo = (serv.quantita || min) + delta;
    if (nuovo < min) nuovo = min;
    if (nuovo > max) nuovo = max;
    serv.quantita = nuovo;
  }
  else if (serv.hasQuantita) {
    let nuovo = (serv.quantita || min) + delta;
    if (nuovo < min) nuovo = min;
    if (nuovo > max) nuovo = max;
    serv.quantita = nuovo;
  }
  aggiornaPreventivo();
};
window.modificaQuantitaDiretta = function(val, idx, min, max) {
  let serv = serviziSelezionati[idx];
  let nuovo = parseInt(val) || min;
  if (nuovo < min) nuovo = min;
  if (nuovo > max) nuovo = max;
  if (["Starter","Plus","VIP"].includes(serv.nome)) {
    serv.nStanze = nuovo;
    aggiornaPreventivo(); // aggiorna tutto, anche CRM!
    return;
  }
  else if (serv.nome === "Visibility MioDottore") serv.quantita = nuovo;
  else if (serv.hasQuantita) serv.quantita = nuovo;
  aggiornaPreventivo();
};
window.rimuoviVocePreventivo = function(idx) {
  if (serviziSelezionati[idx].fixed) return;
  serviziSelezionati.splice(idx, 1);
  aggiornaPreventivo();
};

// DRAG & DROP: tutto aggiungibile!
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
      // Default quantità di partenza
      if (obj.nome === "Visibility MioDottore") obj.quantita = 5;
      else if (obj.nome === "CRM MioDottore") {
        // Solo se bundle presente!
        const bundle = serviziSelezionati.find(s => ["Starter","Plus","VIP"].includes(s.nome));
        obj.quantita = bundle ? bundle.nStanze : 1;
      }
      else obj.quantita = 1;
    }
    if (["Starter","Plus","VIP"].includes(obj.nome)) obj.nStanze = 1;
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
  // CRM: aggiungilo solo se esiste già un bundle
  if(data.nome === "CRM MioDottore") {
    const bundle = serviziSelezionati.find(s => ["Starter","Plus","VIP"].includes(s.nome));
    if(!bundle) {
      alert("Aggiungi prima Starter, Plus o VIP!");
      return;
    }
    data.quantita = bundle.nStanze;
  }
  serviziSelezionati.push(data);
  aggiornaPreventivo();
});

// PROGRESS BAR e PROMO
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

// --- OFFERTA RISERVATA ---
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

  let bundlePromoTxt = '', crmPromoTxt = '', visibilityPromoTxt = '', feePromoTxt = '';
  let totaleMensilePromo = 0, totaleSetupPromo = 0;

  serviziSelezionati.forEach(serv => {
    // Bundle GIPO
    if (["Starter","Plus","VIP"].includes(serv.nome)) {
      let prezzo = prezzoBundle(serv.nome, serv.nStanze, true); // promo = maggiorazione 15%
      bundlePromoTxt += `<div class="promo-voce"><b>${serv.nome} (${serv.nStanze} stanze)</b> <span>${prezzo} € /mese</span> <span class="promo-label">Promo</span></div>`;
      totaleMensilePromo += prezzo;
    }
    // CRM MioDottore
    else if (serv.nome === "CRM MioDottore") {
      let prezzo = (serv.quantita || 1) * 10; // invariato
      crmPromoTxt += `<div class="promo-voce"><b>CRM MioDottore (${serv.quantita} stanze)</b> <span>${prezzo} € /mese</span></div>`;
      totaleMensilePromo += prezzo;
    }
    // Visibility MioDottore
    else if (serv.nome === "Visibility MioDottore") {
      let prezzo = prezzoVisibility(serv.quantita, true);
      visibilityPromoTxt += `<div class="promo-voce"><b>Visibility MioDottore (${serv.quantita} medici)</b> <span>${prezzo} € /mese</span> <span class="promo-label">Promo</span></div>`;
      totaleMensilePromo += prezzo;
    }
    // Attivazione/Formazione SOLO questa setup è promo!
    else if (serv.fixed && serv.nome === "Attivazione / Formazione") {
      let prezzo = serv.nStanze ? prezzoSetup(serv.nStanze, true) : '';
      if(prezzo !== '') {
        feePromoTxt += `<div class="promo-voce"><b>${serv.nome}</b> <span>${prezzo} € una tantum</span> <span class="promo-label">Promo</span></div>`;
        totaleSetupPromo += prezzo;
      }
    }
    // Setup extra (Tablet, Lettore, ecc) -> prezzo pieno, NO promo!
    else if (serv.tipo === "setup") {
      let val = serv.quantita || 1;
      let prezzo = serv.prezzo * val;
      feePromoTxt += `<div class="promo-voce"><b>${serv.nome} (${val} ${serv.labelQuantita || ''})</b> <span>${prezzo} € una tantum</span></div>`;
      totaleSetupPromo += prezzo;
    }
    // Moduli mensili extra (NOA, Dental, Sign, Multi sede, ecc) -> prezzo pieno, no promo!
    else if (serv.hasQuantita) {
      let val = serv.quantita || 1;
      let prezzo = serv.prezzo * val;
      feePromoTxt += `<div class="promo-voce"><b>${serv.nome} (${val} ${serv.labelQuantita || ''})</b> <span>${prezzo} € /mese</span></div>`;
      totaleMensilePromo += prezzo;
    }
  });

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

// Google Calendar & Docusign
document.getElementById('btn-calendar').onclick = function() {
  const titolo = encodeURIComponent("Appuntamento QPWON");
  const dettagli = encodeURIComponent("Conferma appuntamento per la presentazione del preventivo QPWON.");
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titolo}&details=${dettagli}`;
  window.open(url, '_blank');
};
document.getElementById('btn-docusign').onclick = function() {
  window.open("https://www.docusign.com/it", '_blank');
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
    if (serv.fixed && serv.prezzo !== '') {
      txt += `- ${serv.nome}: ${serv.prezzo} € una tantum\n`;
    }
    else if (["Starter","Plus","VIP"].includes(serv.nome)) {
      txt += `- ${serv.nome} (${serv.nStanze} stanze): ${prezzoBundle(serv.nome, serv.nStanze, false)} €/mese\n`;
    } else if (serv.nome === 'CRM MioDottore') {
      txt += `- CRM MioDottore (${serv.quantita} stanze): ${serv.quantita * 10} €/mese\n`;
    } else if (serv.nome === 'Visibility MioDottore') {
      txt += `- Visibility MioDottore (${serv.quantita} medici): ${prezzoVisibility(serv.quantita, false)} €/mese\n`;
    } else if (serv.hasQuantita) {
      let val = serv.quantita || 1;
      txt += `- ${serv.nome} (${val} ${serv.labelQuantita || ''}): ${serv.prezzo * val} ${serv.tipo === "setup" ? "€ una tantum" : "€/mese"}\n`;
    } else if (serv.tipo === "setup") {
      txt += `- ${serv.nome}: ${serv.prezzo} € una tantum\n`;
    } else {
      txt += `- ${serv.nome}: ${serv.prezzo} €\n`;
    }
  });
  let totaleMensile = 0, totaleSetup = 0;
  serviziSelezionati.forEach(serv => {
    if (serv.fixed && serv.prezzo !== '') totaleSetup += parseInt(serv.prezzo);
    else if (["Starter","Plus","VIP"].includes(serv.nome)) totaleMensile += prezzoBundle(serv.nome, serv.nStanze, false);
    else if (serv.nome === "CRM MioDottore") totaleMensile += (serv.quantita || 1) * 10;
    else if (serv.nome === "Visibility MioDottore") totaleMensile += prezzoVisibility(serv.quantita, false);
    else if (serv.hasQuantita) {
      if (serv.tipo === "setup") totaleSetup += serv.prezzo * (serv.quantita || 1);
      else totaleMensile += serv.prezzo * (serv.quantita || 1);
    }
    else if (serv.tipo === "setup") totaleSetup += serv.prezzo;
    else totaleMensile += serv.prezzo;
  });
  txt += `\nTotale canone mensile (listino): ${totaleMensile} €\n`;
  txt += `Totale una tantum (listino): ${totaleSetup} €\n`;

  txt += `\n---------------------------------------\n`;

  if (promoAttiva) {
    txt += `\nOFFERTA RISERVATA (PROMO):\n`;
    let totaleMensilePromo = 0, totaleSetupPromo = 0;
    serviziSelezionati.forEach(serv => {
      if (["Starter","Plus","VIP"].includes(serv.nome)) {
        let prezzo = prezzoBundle(serv.nome, serv.nStanze, true);
        txt += `- ${serv.nome} (${serv.nStanze} stanze): ${prezzo} €/mese (promo)\n`;
        totaleMensilePromo += prezzo;
      } else if (serv.nome === "CRM MioDottore") {
        let prezzo = (serv.quantita || 1) * 10;
        txt += `- CRM MioDottore (${serv.quantita} stanze): ${prezzo} €/mese\n`;
        totaleMensilePromo += prezzo;
      } else if (serv.nome === "Visibility MioDottore") {
        let prezzo = prezzoVisibility(serv.quantita, true);
        txt += `- Visibility MioDottore (${serv.quantita} medici): ${prezzo} €/mese (promo)\n`;
        totaleMensilePromo += prezzo;
      } else if (serv.fixed && serv.nome === "Attivazione / Formazione") {
        let prezzo = serv.nStanze ? prezzoSetup(serv.nStanze, true) : '';
        if(prezzo !== '') {
          txt += `- ${serv.nome}: ${prezzo} € una tantum (promo)\n`;
          totaleSetupPromo += prezzo;
        }
      } else if (serv.tipo === "setup") {
        let val = serv.quantita || 1;
        let prezzo = serv.prezzo * val;
        txt += `- ${serv.nome} (${val} ${serv.labelQuantita || ''}): ${prezzo} € una tantum\n`;
        totaleSetupPromo += prezzo;
      } else if (serv.hasQuantita) {
        let val = serv.quantita || 1;
        let prezzo = serv.prezzo * val;
        txt += `- ${serv.nome} (${val} ${serv.labelQuantita || ''}): ${prezzo} €/mese\n`;
        totaleMensilePromo += prezzo;
      }
    });
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

// Render iniziale
aggiornaPreventivo();

