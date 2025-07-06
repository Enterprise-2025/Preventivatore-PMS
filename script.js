// ✅ Protezione accesso
(function protezioneAccesso() {
  const refOk = document.referrer.includes("enterprise-2025.github.io") || window.opener;
  const accessoConsentito = localStorage.getItem("accesso_consentito") === "ok";
  if (!accessoConsentito || !refOk) {
    document.body.innerHTML = "<h2 style='color: red; text-align: center;'>Accesso non autorizzato</h2>";
    setTimeout(() => location.replace("https://enterprise-2025.github.io/"), 1500);
  }
})();
// ========================
// Preventivatore Drag&Drop QPWON
// ========================

//--- CONFIGURAZIONE PREZZI E SOGLIE
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

//--- LOGICA SCONTO DURATA (solo per totali sui 3 prodotti chiave)
function getScontoDurata() {
  if (durataContratto === 24) return 0.08;
  if (durataContratto === 36) return 0.12;
  if (durataContratto === 48) return 0.18;
  return 0;
}

//--- LOGICA MAGGIORAZIONE PROMO
function getPromoPerc() {
  if (durataContratto === 12) return 0.15;
  if (durataContratto === 24) return 0.10;
  if (durataContratto === 36) return 0.08;
  if (durataContratto === 48) return 0.05;
  return 0.15;
}

//--- VARIABILI GLOBALI
let serviziSelezionati = [];
let promoAttiva = false;
let progressAttiva = false;
let timerInterval = null;
let durataContratto = 12; // default 12 mesi

//--- UTILS
function getPrezzoUnitarioVisibility(nMedici) {
  for(const f of visibilityFasce) {
    if(nMedici >= f.min && nMedici <= f.max) return f.prezzo;
  }
  return 0;
}
function getSogliaIdx(nStanze) {
  for(let i=0; i<soglie.length; i++) {
    if(nStanze <= soglie[i]) return i;
  }
  return soglie.length-1;
}

//--- CALCOLO PREZZO PER I TRE PRODOTTI CHIAVE (TOTALE STANDARD)
function prezzoBundle(nome, nStanze) {
  const idx = getSogliaIdx(nStanze);
  const base = prezziBundleGipo[nome][idx] * nStanze;
  let prezzo = base * 1.3;
  const sconto = getScontoDurata();
  if (sconto > 0) prezzo *= (1 - sconto);
  return Math.round(prezzo);
}
function prezzoVisibility(nMedici) {
  const unit = getPrezzoUnitarioVisibility(nMedici);
  let prezzo = unit * nMedici * 1.3;
  const sconto = getScontoDurata();
  if (sconto > 0) prezzo *= (1 - sconto);
  return Math.round(prezzo);
}
function prezzoSetup(nStanze) {
  const idx = getSogliaIdx(nStanze);
  let prezzo = prezziSetupFee[idx] * 7;
  const sconto = getScontoDurata();
  if (sconto > 0) prezzo *= (1 - sconto);
  return Math.round(prezzo);
}

//--- CALCOLO PREZZO PROMO (+X% SU LISTINO BASE, SOLO SUI 3 PRODOTTI CHIAVE, MAI SCONTO DURATA)
function prezzoBundlePromo(nome, nStanze) {
  const idx = getSogliaIdx(nStanze);
  const base = prezziBundleGipo[nome][idx] * nStanze;
  return Math.round(base * (1 + getPromoPerc()));
}
function prezzoVisibilityPromo(nMedici) {
  const unit = getPrezzoUnitarioVisibility(nMedici);
  const base = unit * nMedici;
  return Math.round(base * (1 + getPromoPerc()));
}
function prezzoSetupPromo(nStanze) {
  const idx = getSogliaIdx(nStanze);
  const base = prezziSetupFee[idx] * 3;
  return Math.round(base * (1 + getPromoPerc()));
}

//--- EVENTI DURATA CONTRATTO
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('input[name="durata"]').forEach(radio => {
    radio.addEventListener('change', function() {
      durataContratto = parseInt(this.value, 10);
      aggiornaPreventivo();
    });
  });
});

//--- LOGICA SETUP FEE OBBLIGATORIA
function aggiornaSetupFee() {
  const primoBundle = serviziSelezionati.find(s => ["Starter","Plus","VIP"].includes(s.nome));
  const nStanze = primoBundle ? primoBundle.nStanze : null;
  const idx = serviziSelezionati.findIndex(s => s.fixed);

  const feeObj = {
    nome: "Attivazione / Formazione",
    prezzo: nStanze ? prezzoSetup(nStanze) : '',
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

//--- RENDER PREVENTIVO (STANDARD)
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

      // Attivazione/Formazione (fisso, mai rimuovibile)
      if (serv.fixed) {
        card.innerHTML = `
          <span class="nome">${serv.nome}</span>
          <span class="prezzo">${serv.prezzo !== '' ? serv.prezzo + ' € una tantum' : '<span style="color:#bbb">—</span>'}</span>
        `;
        dropzone.appendChild(card);
        return;
      }

      // Bundle
      if (["Starter","Plus","VIP"].includes(serv.nome)) {
        prezzo = prezzoBundle(serv.nome, serv.nStanze || 1);
        quantitaInput = `
          Stanze:
          <button type="button" class="btn-qty" onclick="modificaQuantita(${idx}, -1, 1, 20)">-</button>
          <input type="number" min="1" max="20" value="${serv.nStanze || 1}" style="width:40px;text-align:center;font-size:15px;" onchange="modificaQuantitaDiretta(this.value, ${idx}, 1, 20)" />
          <button type="button" class="btn-qty" onclick="modificaQuantita(${idx}, 1, 1, 20)">+</button>
        `;
        prezzo += " € /mese";
      }
      // CRM MioDottore
      else if (serv.nome === "CRM MioDottore") {
        const bundle = serviziSelezionati.find(s => ["Starter","Plus","VIP"].includes(s.nome));
        const nStanze = bundle ? bundle.nStanze : 1;
        serv.quantita = nStanze;
        quantitaInput = `Stanze: <input type="number" value="${nStanze}" readonly style="width:40px;text-align:center;font-size:15px;background:#f1f5f9;pointer-events:none;" />`;
        prezzo = (serv.quantita * 10) + " € /mese";
      }
      // Visibility MioDottore
      else if (serv.nome === "Visibility MioDottore") {
        quantitaInput = `
          Medici:
          <button type="button" class="btn-qty" onclick="modificaQuantita(${idx}, -1, 5, 99)">-</button>
          <input type="number" min="5" max="99" value="${serv.quantita}" style="width:44px;text-align:center;font-size:15px;" onchange="modificaQuantitaDiretta(this.value, ${idx}, 5, 99)" />
          <button type="button" class="btn-qty" onclick="modificaQuantita(${idx}, 1, 5, 99)">+</button>
        `;
        prezzo = prezzoVisibility(serv.quantita) + " € /mese";
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

  // Totali: solo prodotti chiave (bundle, visibility, attivazione) con sconto durata, gli altri no
  let totaleMensile = 0, totaleSetup = 0;
  serviziSelezionati.forEach(serv => {
    if (serv.fixed && serv.prezzo !== '') totaleSetup += prezzoSetup(serv.nStanze);
    else if (["Starter","Plus","VIP"].includes(serv.nome)) totaleMensile += prezzoBundle(serv.nome, serv.nStanze || 1);
    else if (serv.nome === "CRM MioDottore") totaleMensile += (serv.quantita || 1) * 10;
    else if (serv.nome === "Visibility MioDottore") totaleMensile += prezzoVisibility(serv.quantita);
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

//--- SINCRONIZZA CRM
function sincronizzaCRM() {
  const bundle = serviziSelezionati.find(s => ["Starter","Plus","VIP"].includes(s.nome));
  let crmIdx = serviziSelezionati.findIndex(s => s.nome === "CRM MioDottore");
  if (!bundle && crmIdx !== -1) {
    serviziSelezionati.splice(crmIdx, 1);
  } else if (bundle && crmIdx !== -1) {
    serviziSelezionati[crmIdx].quantita = bundle.nStanze;
  }
}

//--- MODIFICA QUANTITÀ E RIMOZIONE
window.modificaQuantita = function(idx, delta, min, max) {
  let serv = serviziSelezionati[idx];
  if (["Starter","Plus","VIP"].includes(serv.nome)) {
    let nuovo = (serv.nStanze || 1) + delta;
    if (nuovo < min) nuovo = min;
    if (nuovo > max) nuovo = max;
    serv.nStanze = nuovo;
    aggiornaPreventivo();
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
    aggiornaPreventivo();
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

//--- DRAG & DROP (listener sempre attivi dopo il DOM)
document.addEventListener('DOMContentLoaded', function() {
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
        if (obj.nome === "Visibility MioDottore") obj.quantita = 5;
        else if (obj.nome === "CRM MioDottore") {
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
});

//--- PROGRESS BAR & PROMO PANEL
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
  let duration = 9;
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
      aggiornaPreventivo();
      aggiornaProgressBar();
      if (callback) callback();
    }
  }, 1000);
}

//--- PANEL PROMO (OFFERTA RISERVATA con DOPPIO RISPARMIO)
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
    if (["Starter","Plus","VIP"].includes(serv.nome)) {
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
      if(prezzo !== '') {
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

  // --- CALCOLO RISPARMIO MENSILE E ATTIVAZIONE + SPESA GIORNALIERA
  let totaleIniziale = 0, setupListino = 0, setupPromo = 0;
  serviziSelezionati.forEach(serv => {
    if (["Starter","Plus","VIP"].includes(serv.nome)) {
      const idx = getSogliaIdx(serv.nStanze || 1);
      const base = prezziBundleGipo[serv.nome][idx] * (serv.nStanze || 1);
      totaleIniziale += Math.round(base * 1.3);
    } else if (serv.nome === "CRM MioDottore") {
      const bundle = serviziSelezionati.find(s => ["Starter","Plus","VIP"].includes(s.nome));
      totaleIniziale += (bundle ? bundle.nStanze : 1) * 10;
    } else if (serv.nome === "Visibility MioDottore") {
      const unit = getPrezzoUnitarioVisibility(serv.quantita);
      totaleIniziale += Math.round(unit * serv.quantita * 1.3);
    } else if (serv.fixed && serv.nome === "Attivazione / Formazione") {
      // Setup listino: prezzoSetupFee[nStanze] * 7 (no sconto, no promo)
      const idx = getSogliaIdx(serv.nStanze || 1);
      setupListino += Math.round(prezziSetupFee[idx] * 7);
      setupPromo   += Math.round(prezziSetupFee[idx] * 3 * (1 + getPromoPerc()));
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
  if (panel.style.display === 'block') setTimeout(()=>{ panel.scrollIntoView({behavior:'smooth'}); },200);
}

//--- BOTTONI: PROMO, EXPORT, CALENDAR, DOCUSIGN
document.addEventListener('DOMContentLoaded', function() {
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

  document.getElementById('btn-calendar').onclick = function() {
    const titolo = encodeURIComponent("Appuntamento QPWON");
    const dettagli = encodeURIComponent("Conferma appuntamento per la presentazione del preventivo QPWON.");
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titolo}&details=${dettagli}`;
    window.open(url, '_blank');
  };
  document.getElementById('btn-docusign').onclick = function() {
    window.open("https://www.docusign.com/it", '_blank');
  };
});

//--- EXPORT TXT (resta uguale, vedi versione precedente)

//--- RENDER INIZIALE
document.addEventListener('DOMContentLoaded', aggiornaPreventivo);

