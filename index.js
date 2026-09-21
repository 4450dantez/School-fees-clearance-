/* =========================================================================
   SCHOOL FEES CLEARANCE SYSTEM
   File: index.js
   Purpose: Application logic — data model, persistence, state and
            rendering for the student/admin fees clearance system.
   Author: Daniel Muendo (Dantez) — CICT 14413/24
   ========================================================================= */

(function () {
  "use strict";

  var STORAGE_KEY = "sfc_students_v1";
  var ADMIN_PASSWORD = "clearance2026";
  var INSTITUTE = "Machakos Institute of Technology";

  var store;
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    store = raw ? JSON.parse(raw) : null;
  } catch (e) { store = null; }

  if (!store || !Array.isArray(store)) {
    store = [
      { regNo: "CICT 14413/24", name: "Daniel Muendo", program: "Certificate in ICT", feesRequired: 42000, feesPaid: 42000, history: [{amount: 42000, note: "Full payment", date: "2026-08-02"}] },
      { regNo: "CICT 10221/24", name: "Wanjiru Kamau", program: "Certificate in ICT", feesRequired: 42000, feesPaid: 26000, history: [{amount: 26000, note: "Term 1 & 2 deposit", date: "2026-07-14"}] },
      { regNo: "CDPB 10988/24", name: "Brian Otieno", program: "Desktop Publishing", feesRequired: 35000, feesPaid: 35000, history: [{amount: 35000, note: "Full payment", date: "2026-06-30"}] }
    ];
    persist();
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch (e) { /* storage unavailable */ }
  }

  function balance(s) { return s.feesRequired - s.feesPaid; }
  function isCleared(s) { return balance(s) <= 0; }
  function money(n) {
    var sign = n < 0 ? "-" : "";
    return sign + "KSh " + Math.abs(Math.round(n)).toLocaleString();
  }
  function todayISO() {
    var d = new Date();
    return d.toISOString().slice(0, 10);
  }
  function readableDate(iso) {
    try {
      return new Date(iso + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    } catch (e) { return iso; }
  }

  var session = { role: null, regNo: null }; // role: 'admin' | 'student'
  var ui = { openDrawerFor: null, view: "roster" }; // view: 'roster' | 'certificate'

  function showToast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (k === "class") e.className = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else if (k.indexOf("on") === 0) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function text(str) { return document.createTextNode(str); }

  function letterhead(rightNode) {
    var lh = el("div", { class: "letterhead" }, [
      el("div", { class: "crest" }, [text("M")]),
      el("div", { class: "titles" }, [
        el("h1", {}, [text(INSTITUTE)]),
        el("div", { class: "sub" }, [text("Fees Clearance Register")])
      ])
    ]);
    if (rightNode) lh.appendChild(rightNode);
    return lh;
  }

  function render() {
    var root = document.getElementById("app");
    root.innerHTML = "";

    if (!session.role) {
      root.appendChild(letterhead());
      root.appendChild(renderGate());
    } else if (session.role === "admin") {
      var right = el("div", { class: "signed-in" }, [
        text("Signed in as Admin"),
        el("button", { onclick: function () { session.role = null; ui.openDrawerFor = null; render(); } }, [text("Sign out")])
      ]);
      root.appendChild(letterhead(right));
      root.appendChild(renderAdmin());
    } else if (session.role === "student") {
      var s = findStudent(session.regNo);
      var right = el("div", { class: "signed-in" }, [
        text(s ? s.regNo : ""),
        el("button", { onclick: function () { session.role = null; session.regNo = null; ui.view = "roster"; render(); } }, [text("Sign out")])
      ]);
      root.appendChild(letterhead(right));
      root.appendChild(renderStudent());
    }
  }

  function findStudent(regNo) {
    regNo = (regNo || "").trim().toLowerCase();
    return store.filter(function (s) { return s.regNo.toLowerCase() === regNo; })[0];
  }

  /* ---------------- Gate ---------------- */
  function renderGate() {
    var wrap = document.createDocumentFragment();

    var hero = el("div", { class: "gate-hero" }, [
      el("div", { class: "kicker" }, [text("Welcome")]),
      el("h2", {}, [text("Check or manage fee clearance status")]),
      el("p", {}, [text("Students look up their balance and print a clearance certificate. Staff record payments and update the register.")])
    ]);
    wrap.appendChild(hero);

    var cards = el("div", { class: "role-cards" }, [
      el("button", { class: "role-card", onclick: function () { renderStudentLogin(); } }, [
        el("div", { class: "mark" }, [text("S")]),
        el("div", {}, [
          el("div", { class: "rt" }, [text("I'm a student")]),
          el("div", { class: "rd" }, [text("View your balance and clearance status")])
        ])
      ]),
      el("button", { class: "role-card", onclick: function () { renderAdminLogin(); } }, [
        el("div", { class: "mark" }, [text("A")]),
        el("div", {}, [
          el("div", { class: "rt" }, [text("I'm staff / admin")]),
          el("div", { class: "rd" }, [text("Register students and record payments")])
        ])
      ])
    ]);
    wrap.appendChild(cards);

    var holder = el("div", {}, [wrap]);
    return holder;
  }

  function renderStudentLogin(errorMsg) {
    var root = document.getElementById("app");
    root.innerHTML = "";
    var right = null;
    root.appendChild(letterhead(right));

    var regInput;
    var form = el("form", { class: "panel", onsubmit: function (ev) {
      ev.preventDefault();
      var s = findStudent(regInput.value);
      if (!s) { renderStudentLogin("No record found for that registration number."); return; }
      session.role = "student";
      session.regNo = s.regNo;
      ui.view = "roster";
      render();
    } }, [
      el("div", { class: "field" }, [
        el("label", {}, [text("Registration number")]),
        (regInput = el("input", { type: "text", placeholder: "e.g. CICT 14413/24", autocomplete: "off", autocapitalize: "characters" }))
      ]),
      el("div", { class: "field" }, [
        el("button", { class: "btn btn-primary", type: "submit" }, [text("View my status")])
      ])
    ]);
    form.insertBefore(regInput, form.querySelector(".field:nth-child(1)").lastChild.nextSibling);
    root.appendChild(form);
    if (errorMsg) root.appendChild(el("div", { class: "error-text" }, [text(errorMsg)]));
    root.appendChild(el("div", { class: "btn-row" }, [
      el("button", { class: "btn btn-ghost", type: "button", onclick: render }, [text("Back")])
    ]));
  }

  function renderAdminLogin(errorMsg) {
    var root = document.getElementById("app");
    root.innerHTML = "";
    root.appendChild(letterhead());

    var passInput;
    var form = el("form", { class: "panel", onsubmit: function (ev) {
      ev.preventDefault();
      if (passInput.value !== ADMIN_PASSWORD) { renderAdminLogin("Incorrect password."); return; }
      session.role = "admin";
      render();
    } }, [
      el("div", { class: "field" }, [
        el("label", {}, [text("Admin password")]),
        (passInput = el("input", { type: "password", placeholder: "Enter password", autocomplete: "off" }))
      ]),
      el("div", { class: "hint" }, [text("Demo password: clearance2026")]),
      el("div", { class: "field" }, [
        el("button", { class: "btn btn-primary", type: "submit", style: "margin-top:14px" }, [text("Sign in")])
      ])
    ]);
    root.appendChild(form);
    if (errorMsg) root.appendChild(el("div", { class: "error-text" }, [text(errorMsg)]));
    root.appendChild(el("div", { class: "btn-row" }, [
      el("button", { class: "btn btn-ghost", type: "button", onclick: render }, [text("Back")])
    ]));
  }

  /* ---------------- Student view ---------------- */
  function renderStudent() {
    var s = findStudent(session.regNo);
    if (!s) { session.role = null; return renderGate(); }

    if (ui.view === "certificate") return renderCertificate(s);

    var bal = balance(s);
    var cleared = isCleared(s);

    var card = el("div", { class: "status-card" }, [
      el("div", { class: "name" }, [text(s.name)]),
      el("div", { class: "prog" }, [text(s.program + " · " + s.regNo)]),
      el("div", { class: "status-badge " + (cleared ? "cleared" : "pending") }, [text(cleared ? "Cleared" : "Balance pending")]),
      el("div", { class: "ledger" }, [
        el("div", { class: "ledger-row" }, [el("span", { class: "l" }, [text("Fees required")]), el("span", { class: "v" }, [text(money(s.feesRequired))])]),
        el("div", { class: "ledger-row" }, [el("span", { class: "l" }, [text("Fees paid")]), el("span", { class: "v" }, [text(money(s.feesPaid))])]),
        el("div", { class: "ledger-row total" }, [
          el("span", { class: "l" }, [text(cleared ? "Overpaid / credit" : "Balance owed")]),
          el("span", { class: "v " + (cleared ? "clear" : "owed") }, [text(money(Math.abs(bal)))])
        ])
      ])
    ]);

    var frag = document.createDocumentFragment();
    frag.appendChild(card);

    if (cleared) {
      frag.appendChild(el("div", { class: "btn-row" }, [
        el("button", { class: "btn btn-primary", onclick: function () { ui.view = "certificate"; render(); } }, [text("Generate clearance certificate")])
      ]));
    } else {
      frag.appendChild(el("p", { class: "hint", style: "margin-top:14px" }, [
        text("Clearance certificates are issued once your balance reaches KSh 0. Contact the accounts office to make a payment.")
      ]));
    }

    if (s.history && s.history.length) {
      frag.appendChild(el("div", { class: "section-head" }, [el("h3", {}, [text("Payment history")])]));
      var roster = el("div", { class: "roster" });
      s.history.slice().reverse().forEach(function (h) {
        roster.appendChild(el("div", { class: "roster-row" }, [
          el("div", {}, [
            el("div", { class: "rn" }, [text(money(h.amount))]),
            el("div", { class: "rr" }, [text((h.note || "Payment") + " · " + readableDate(h.date))])
          ]),
          el("div", {})
        ]));
      });
      frag.appendChild(roster);
    }

    var holder = el("div", {}, []);
    Array.from(frag.childNodes).forEach(function (n) { holder.appendChild(n); });
    return holder;
  }

  function renderCertificate(s) {
    var holder = el("div", {}, []);
    var cert = el("div", { class: "certificate" }, [
      el("div", { class: "cert-inner" }, [
        el("div", { class: "cert-inst" }, [text(INSTITUTE.toUpperCase())]),
        el("h2", { class: "cert-title" }, [text("Certificate of Fees Clearance")]),
        el("div", { class: "cert-sub" }, [text("Office of the Bursar")]),
        el("div", { class: "cert-body" }, [
          text("This is to certify that "),
          el("span", { class: "fig" }, [text(s.name)]),
          text(", registration number "),
          el("span", { class: "fig" }, [text(s.regNo)]),
          text(", enrolled in "),
          el("span", { class: "fig" }, [text(s.program)]),
          text(", has fully settled fees of "),
          el("span", { class: "fig" }, [text(money(s.feesRequired))]),
          text(" and is hereby cleared of any outstanding balance as of "),
          el("span", { class: "fig" }, [text(readableDate(todayISO()))]),
          text(".")
        ]),
        el("div", { class: "cert-meta" }, [
          el("div", { class: "sig" }, [el("div", { class: "line" }), text("Bursar")]),
          el("div", { class: "sig" }, [el("div", { class: "line" }), text("Registrar")])
        ])
      ])
    ]);
    holder.appendChild(cert);
    holder.appendChild(el("div", { class: "btn-row" }, [
      el("button", { class: "btn btn-primary", onclick: function () { window.print(); } }, [text("Print / save as PDF")]),
      el("button", { class: "btn btn-ghost", onclick: function () { ui.view = "roster"; render(); } }, [text("Back")])
    ]));
    return holder;
  }

  /* ---------------- Admin view ---------------- */
  function renderAdmin() {
    var holder = el("div", {}, []);

    holder.appendChild(el("div", { class: "section-head" }, [
      el("h3", {}, [text("Register a student")])
    ]));

    var nameI, regI, progI, reqI;
    var addForm = el("form", { class: "panel", onsubmit: function (ev) {
      ev.preventDefault();
      var regNo = regI.value.trim();
      if (!regNo || !nameI.value.trim()) { showToast("Registration number and name are required."); return; }
      if (findStudent(regNo)) { showToast("A student with that registration number already exists."); return; }
      var req = parseFloat(reqI.value) || 0;
      store.push({ regNo: regNo, name: nameI.value.trim(), program: progI.value.trim() || "Unspecified programme", feesRequired: req, feesPaid: 0, history: [] });
      persist();
      showToast("Student registered.");
      render();
    } }, [
      el("div", { class: "field" }, [ el("label", {}, [text("Full name")]), (nameI = el("input", { type: "text", placeholder: "e.g. Grace Njeri" })) ]),
      el("div", { class: "field" }, [ el("label", {}, [text("Registration number")]), (regI = el("input", { type: "text", placeholder: "e.g. CICT 10077/25" })) ]),
      el("div", { class: "field" }, [ el("label", {}, [text("Programme")]), (progI = el("input", { type: "text", placeholder: "e.g. Certificate in ICT" })) ]),
      el("div", { class: "field" }, [ el("label", {}, [text("Fees required (KSh)")]), (reqI = el("input", { type: "number", min: "0", step: "1", placeholder: "e.g. 42000" })) ]),
      el("button", { class: "btn btn-primary", type: "submit" }, [text("Add to register")])
    ]);
    holder.appendChild(addForm);

    var cleared = store.filter(isCleared).length;
    holder.appendChild(el("div", { class: "section-head" }, [
      el("h3", {}, [text("Register")]),
      el("span", { class: "count" }, [text(cleared + " of " + store.length + " cleared")])
    ]));

    if (!store.length) {
      holder.appendChild(el("div", { class: "roster" }, [el("div", { class: "roster-empty" }, [text("No students registered yet.")])]));
    } else {
      var roster = el("div", { class: "roster" });
      store.forEach(function (s) {
        var bal = balance(s);
        var c = isCleared(s);
        var row = el("div", { class: "roster-row" }, [
          el("button", { class: "tap-row", onclick: (function (regNo) { return function () { ui.openDrawerFor = (ui.openDrawerFor === regNo ? null : regNo); render(); }; })(s.regNo) }, [
            el("div", {}, [
              el("div", { class: "rn" }, [text(s.name)]),
              el("div", { class: "rr" }, [text(s.regNo + " · " + s.program)])
            ]),
            el("div", { class: "bal " + (c ? "clear" : "owed") }, [text(money(Math.abs(bal))), el("small", {}, [text(c ? "CLEARED" : "OWED")])])
          ])
        ]);
        roster.appendChild(row);

        if (ui.openDrawerFor === s.regNo) {
          roster.appendChild(renderDrawer(s));
        }
      });
      holder.appendChild(roster);
    }

    return holder;
  }

  function renderDrawer(s) {
    var amtI, noteI;
    var wrap = el("div", { style: "padding:0 14px 14px;" }, [
      el("div", { class: "drawer" }, [
        el("div", { class: "dh" }, [
          el("strong", {}, [text("Record payment — " + s.name)]),
          el("button", { onclick: function () { ui.openDrawerFor = null; render(); } }, [text("Close")])
        ]),
        el("form", { onsubmit: function (ev) {
          ev.preventDefault();
          var amt = parseFloat(amtI.value);
          if (!amt || amt <= 0) { showToast("Enter a valid amount."); return; }
          s.feesPaid += amt;
          s.history = s.history || [];
          s.history.push({ amount: amt, note: noteI.value.trim() || "Payment", date: todayISO() });
          persist();
          showToast(isCleared(s) ? "Payment recorded — student is now cleared." : "Payment recorded.");
          render();
        } }, [
          el("div", { class: "field" }, [ el("label", {}, [text("Amount (KSh)")]), (amtI = el("input", { type: "number", min: "1", step: "1", autofocus: "true" })) ]),
          el("div", { class: "field" }, [ el("label", {}, [text("Note (optional)")]), (noteI = el("input", { type: "text", placeholder: "e.g. Term 2 deposit" })) ]),
          el("div", { class: "btn-row" }, [
            el("button", { class: "btn btn-primary", type: "submit" }, [text("Save payment")]),
            el("button", { class: "btn btn-danger", type: "button", onclick: function () {
              if (confirm("Remove " + s.name + " from the register? This cannot be undone.")) {
                store = store.filter(function (x) { return x.regNo !== s.regNo; });
                persist();
                ui.openDrawerFor = null;
                showToast("Student removed.");
                render();
              }
            } }, [text("Remove student")])
          ])
        ])
      ])
    ]);
    return wrap;
  }

  render();
})();
