// Mortgage Extra Payment & Early Payoff Calculator
(function() {
  'use strict';

  let state = {
    loanAmount: 350000,
    interestRate: 6.75, // %
    loanTermYears: 30,
    extraMonthly: 200,
    extraAnnual: 0,
    viewMode: 'yearly' // 'yearly' | 'monthly'
  };

  function formatCurrency(val) {
    return '$' + Math.round(val).toLocaleString('en-US');
  }

  function formatDecimal(val) {
    return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function calculate() {
    const P = state.loanAmount;
    const r = (state.interestRate / 100) / 12;
    const n = state.loanTermYears * 12;

    if (P <= 0 || r <= 0 || n <= 0) return;

    // Standard Monthly Payment (P&I)
    const standardPayment = (P * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
    const standardTotalInterest = (standardPayment * n) - P;

    // Simulation with extra payments
    let balance = P;
    let totalInterestWithExtra = 0;
    let monthsPaid = 0;
    const schedule = []; // monthly points
    let yearlyData = [];
    let curYearPrincipal = 0;
    let curYearInterest = 0;
    let curYearExtra = 0;

    while (balance > 0.01 && monthsPaid < n) {
      monthsPaid++;
      const interestMonth = balance * r;
      let extraThisMonth = state.extraMonthly;
      if (monthsPaid % 12 === 0) {
        extraThisMonth += state.extraAnnual;
      }

      let principalMonth = (standardPayment - interestMonth) + extraThisMonth;

      if (balance + interestMonth <= standardPayment + extraThisMonth) {
        // Last payment
        principalMonth = balance;
        balance = 0;
      } else {
        balance -= (principalMonth);
      }

      totalInterestWithExtra += interestMonth;
      curYearPrincipal += principalMonth;
      curYearInterest += interestMonth;
      curYearExtra += extraThisMonth;

      schedule.push({
        month: monthsPaid,
        payment: principalMonth + interestMonth,
        principal: principalMonth,
        interest: interestMonth,
        extra: extraThisMonth,
        balance: Math.max(0, balance)
      });

      if (monthsPaid % 12 === 0 || balance <= 0.01) {
        yearlyData.push({
          year: Math.ceil(monthsPaid / 12),
          principal: curYearPrincipal,
          interest: curYearInterest,
          extra: curYearExtra,
          balance: Math.max(0, balance)
        });
        curYearPrincipal = 0;
        curYearInterest = 0;
        curYearExtra = 0;
      }
    }

    const interestSaved = Math.max(0, standardTotalInterest - totalInterestWithExtra);
    const monthsSaved = Math.max(0, n - monthsPaid);
    const yearsSaved = Math.floor(monthsSaved / 12);
    const remainingMonthsSaved = monthsSaved % 12;

    let timeSavedStr = '';
    if (yearsSaved > 0 && remainingMonthsSaved > 0) {
      timeSavedStr = `${yearsSaved} years & ${remainingMonthsSaved} months earlier!`;
    } else if (yearsSaved > 0) {
      timeSavedStr = `${yearsSaved} years earlier!`;
    } else if (remainingMonthsSaved > 0) {
      timeSavedStr = `${remainingMonthsSaved} months earlier!`;
    } else {
      timeSavedStr = 'Standard 30-year payoff';
    }

    // Payoff dates
    const now = new Date();
    const standardPayoffDate = new Date(now.getFullYear(), now.getMonth() + n);
    const acceleratedPayoffDate = new Date(now.getFullYear(), now.getMonth() + monthsPaid);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatPayoffDate = (d) => `${monthNames[d.getMonth()]} ${d.getFullYear()}`;

    // Update DOM
    document.getElementById('hero-interest-saved').textContent = formatCurrency(interestSaved);
    document.getElementById('hero-time-saved').textContent = `⚡ Pay off ${timeSavedStr}`;

    document.getElementById('res-std-payment').textContent = formatDecimal(standardPayment);
    document.getElementById('res-new-payment').textContent = formatDecimal(standardPayment + state.extraMonthly);
    document.getElementById('res-new-payoff-date').textContent = formatPayoffDate(acceleratedPayoffDate);
    document.getElementById('res-orig-payoff-date').textContent = formatPayoffDate(standardPayoffDate);

    // Comparison cards
    document.getElementById('comp-orig-payment').textContent = formatDecimal(standardPayment);
    document.getElementById('comp-orig-interest').textContent = formatCurrency(standardTotalInterest);
    document.getElementById('comp-orig-total').textContent = formatCurrency(P + standardTotalInterest);
    document.getElementById('comp-orig-years').textContent = `${state.loanTermYears} years`;

    document.getElementById('comp-accel-payment').textContent = formatDecimal(standardPayment + state.extraMonthly);
    document.getElementById('comp-accel-interest').textContent = formatCurrency(totalInterestWithExtra);
    document.getElementById('comp-accel-total').textContent = formatCurrency(P + totalInterestWithExtra);
    document.getElementById('comp-accel-years').textContent = `${(monthsPaid / 12).toFixed(1)} years`;

    // Render Amortization Table
    renderTable(yearlyData, schedule);

    // Save
    localStorage.setItem('mortgage_calc_state', JSON.stringify(state));
  }

  function renderTable(yearlyData, monthlyData) {
    const tbody = document.getElementById('amort-tbody');
    tbody.innerHTML = '';

    if (state.viewMode === 'yearly') {
      yearlyData.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>Year ${row.year}</td>
          <td>${formatCurrency(row.principal)}</td>
          <td>${formatCurrency(row.interest)}</td>
          <td>${formatCurrency(row.extra)}</td>
          <td>${formatCurrency(row.balance)}</td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      monthlyData.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>Mo ${row.month}</td>
          <td>${formatDecimal(row.principal)}</td>
          <td>${formatDecimal(row.interest)}</td>
          <td>${formatDecimal(row.extra)}</td>
          <td>${formatDecimal(row.balance)}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  function init() {
    const saved = localStorage.getItem('mortgage_calc_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
      } catch (e) {}
    }

    const inputLoan = document.getElementById('input-loan');
    const inputRate = document.getElementById('input-rate');
    const inputExtra = document.getElementById('input-extra-monthly');
    const inputAnnual = document.getElementById('input-extra-annual');

    inputLoan.value = state.loanAmount;
    inputRate.value = state.interestRate;
    inputExtra.value = state.extraMonthly;
    inputAnnual.value = state.extraAnnual;

    inputLoan.addEventListener('input', (e) => {
      state.loanAmount = Math.max(10000, parseFloat(e.target.value) || 0);
      calculate();
    });

    inputRate.addEventListener('input', (e) => {
      state.interestRate = Math.max(0.1, Math.min(20, parseFloat(e.target.value) || 6.5));
      calculate();
    });

    inputExtra.addEventListener('input', (e) => {
      state.extraMonthly = Math.max(0, parseFloat(e.target.value) || 0);
      calculate();
    });

    inputAnnual.addEventListener('input', (e) => {
      state.extraAnnual = Math.max(0, parseFloat(e.target.value) || 0);
      calculate();
    });

    // Term buttons
    document.querySelectorAll('.term-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.term, 10) === state.loanTermYears);
      btn.addEventListener('click', () => {
        document.querySelectorAll('.term-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.loanTermYears = parseInt(btn.dataset.term, 10);
        calculate();
      });
    });

    // View toggle (yearly vs monthly)
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === state.viewMode);
      btn.addEventListener('click', () => {
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.viewMode = btn.dataset.view;
        calculate();
      });
    });

    // FAQ Accordion
    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.parentElement;
        item.classList.toggle('open');
      });
    });

    calculate();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
