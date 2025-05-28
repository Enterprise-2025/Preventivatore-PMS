// ✅ Protezione accesso
(function protezioneAccesso() {
  const refOk = document.referrer.includes("enterprise-2025.github.io") || window.opener;
  const accessoConsentito = localStorage.getItem("accesso_consentito") === "ok";
  if (!accessoConsentito || !refOk) {
    document.body.innerHTML = "<h2 style='color: red; text-align: center;'>Accesso non autorizzato</h2>";
    setTimeout(() => location.replace("https://enterprise-2025.github.io/"), 1500);
  }
})();

// ✅ Configurazione prezzi
const prezzi = {
  starter: {
    solo: [109, 99, 89, 69, 59, 49, 29, 19],
    crm:  [119, 109, 99, 79, 69, 59, 39, 29]
  },
  plus: {
    solo: [129, 119, 109, 89, 69, 59, 49, 39],
    crm:  [139, 129, 119, 99, 79, 69, 59, 49]
  },
  vip: {
    solo: [139, 129, 119, 99, 79, 69, 59, 49],
    crm:  [149, 139, 129, 109, 89, 79, 69, 59]
  }
};

const setup = [500, 500, 500, 500, 750, 750, 750, 1000];
const soglie = [1, 2, 4, 6, 8, 10, 15, 20];

// 🔍 Trova indice soglia in base al numero di stanze
function getIndiceStanze(stanze) {
  for (let i = 0; i < soglie.length; i++) {
    if (stanze <= soglie[i]) return i;
  }
  return soglie.length - 1;
}

// ✅ Eventi iniziali
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("calculate-btn").addEventListener("click", calcolaPreventivo);
  document.getElementById("check-btn").addEventListener("click", avviaVerifica);
});

// ✅ Calcolo dei prezzi
function calcolaPreventivo() {
  const stanze = Math.floor(parseFloat(document.getElementById("rooms").value));
  const medici = Math.floor(parseFloat(document.getElementById("doctors").value));
  const bundle = document.getElementById("bundle").value || "plus";
  const crm = document.getElementById("crm").checked;
  const tablet = document.getElementById("tabletFirma").checked;
  const lettore = document.getElementById("lettoreTessera").checked;

  if (isNaN(stanze) || isNaN(medici) || stanze <= 0 || medici <= 0) {
    mostraErrore("Inserisci un numero valido di ambulatori e medici.");
    return;
  }

  const idx = getIndiceStanze(stanze);
  let prezzoUnitario = prezzi[bundle][crm ? "crm" : "solo"][idx];

  if ((medici / stanze) <= 1.3) {
    prezzoUnitario = prezzoUnitario / 1.5;
  }

  const canoneReale = prezzoUnitario * stanze;
  const setupReale = setup[idx];

  const listinoMensile = canoneReale * 1.25;
  const listinoSetup = setupReale * 2;

  const tabletPrezzo = tablet ? 429 : 0;
  const lettorePrezzo = lettore ? 79 : 0;

  const totaleSetupListino = listinoSetup + tabletPrezzo + lettorePrezzo;
  const totaleSetupReale = setupReale + tabletPrezzo + lettorePrezzo;

  // DOM aggiornamento
  document.getElementById("monthly-list-price").textContent = `${listinoMensile.toFixed(2)} €`;
  document.getElementById("setup-list-price").textContent = `${listinoSetup.toFixed(2)} €`;
  document.getElementById("setup-total").textContent = `${totaleSetupListino.toFixed(2)} €`;

  // Salva valori per dopo
  window._canoneReale = canoneReale;
  window._setupReale = setupReale;
  window._totaleReale = totaleSetupReale;
  window._listinoMensile = listinoMensile;
  window._listinoSetup = listinoSetup;

  document.getElementById("listino-panel").classList.remove("hidden");
  document.getElementById("loading-spinner").classList.add("hidden");
  document.getElementById("dettaglio-panel").classList.add("hidden");

  document.getElementById("listino-panel").scrollIntoView({ behavior: "smooth" });
}

// ✅ Avvio verifica promozione con scroll
function avviaVerifica() {
  const spinner = document.getElementById("loading-spinner");
  const countdown = document.getElementById("countdown");
  const bar = document.getElementById("progressBar");

  // Mostra spinner e scorri verso il pannello
  spinner.classList.remove("hidden");
  spinner.scrollIntoView({ behavior: "smooth" });

  document.getElementById("dettaglio-panel").classList.add("hidden");

  // Reset barra
  bar.style.width = "0%";
  let percent = 0;
  const barInterval = setInterval(() => {
    percent += 100 / 150;
    bar.style.width = `${percent}%`;
    if (percent >= 100) clearInterval(barInterval);
  }, 100);

  // Countdown
  let seconds = 15;
  countdown.textContent = `Attendere ${seconds} secondi...`;
  const interval = setInterval(() => {
    seconds--;
    countdown.textContent = `Attendere ${seconds} secondi...`;
    if (seconds <= 0) {
      clearInterval(interval);
      spinner.classList.add("hidden");
      mostraOffertaRiservata();
    }
  }, 1000);
}

// ✅ Mostra i prezzi reali nell’offerta riservata
function mostraOffertaRiservata() {
  const realeCanone = window._canoneReale;
  const realeSetup = window._setupReale;
  const listCanone = window._listinoMensile;
  const listSetup = window._listinoSetup;

  document.getElementById("default-monthly-price").textContent = `${realeCanone.toFixed(2)} €`;
  document.getElementById("list-monthly-crossed").textContent = `${listCanone.toFixed(2)} €`;

  document.getElementById("setup-fee").textContent = `${realeSetup.toFixed(2)} €`;
  document.getElementById("list-setup-crossed").textContent = `${listSetup.toFixed(2)} €`;

  document.getElementById("dettaglio-panel").classList.remove("hidden");
  document.getElementById("dettaglio-panel").scrollIntoView({ behavior: "smooth" });
}

// ✅ Messaggio di errore
function mostraErrore(msg) {
  const div = document.createElement("div");
  div.style.color = "red";
  div.style.textAlign = "center";
  div.style.fontWeight = "bold";
  div.style.marginBottom = "12px";
  div.textContent = msg;
  document.querySelector("form").prepend(div);
  setTimeout(() => div.remove(), 3000);
}
