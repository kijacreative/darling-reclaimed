/*
  Darling Reclaimed — coverage calculator.

  Sums one or more wall areas, applies a waste allowance, rounds up to whole
  boxes, and prepares a real /cart/add submission for the selected installation
  variant. The form posts normally, so add-to-cart still works without JS
  once a quantity has been computed.
*/
class DRCoverageCalculator extends HTMLElement {
  connectedCallback() {
    this.coveragePerBox = parseFloat(this.dataset.coveragePerBox) || 10;
    this.pricingUnit = this.dataset.pricingUnit === 'per_sqft' ? 'per_sqft' : 'per_box';
    this.currency = this.dataset.currency || 'USD';
    this.options = this.parseOptions();

    this.wallsEl = this.querySelector('[data-walls]');
    this.addBtn = this.querySelector('[data-add-wall]');
    this.submitBtn = this.querySelector('[data-submit]');
    this.unavailableEl = this.querySelector('[data-unavailable]');
    this.variantInput = this.querySelector('[data-variant-id]');
    this.quantityInput = this.querySelector('[data-quantity]');

    this.out = {
      totalArea: this.querySelector('[data-total-area]'),
      boxes: this.querySelector('[data-boxes]'),
      wasteNote: this.querySelector('[data-waste-note]'),
      areaWithWaste: this.querySelector('[data-area-with-waste]'),
      coveragePurchased: this.querySelector('[data-coverage-purchased]'),
      cost: this.querySelector('[data-cost]'),
    };

    this.renderInstallOptions();

    this.addEventListener('input', this.onChange);
    this.addEventListener('change', this.onChange);

    if (this.addBtn) {
      this.addBtn.addEventListener('click', () => this.addWall());
    }

    this.addEventListener('click', (event) => {
      const remove = event.target.closest('[data-remove-wall]');
      if (remove) this.removeWall(remove.closest('[data-wall]'));
    });

    this.render();
  }

  /* Installation options, keyed by block id, from the section's JSON payload */
  parseOptions() {
    const el = this.querySelector('[data-dr-options]');
    if (!el) return {};

    let rows = [];
    try {
      rows = JSON.parse(el.textContent) || [];
    } catch (error) {
      return {};
    }

    const map = {};
    rows.forEach((row) => {
      if (!row || !row.id) return;
      map[row.id] = {
        label: row.label || '',
        variantId: row.variantId ? String(row.variantId) : '',
        price: parseInt(row.price, 10) || 0,
        /* An option may ship a different box size than the section default */
        coverage: parseFloat(row.coverage) || 0,
        available: row.available === true,
      };
    });
    return map;
  }

  onChange = () => this.render();

  /* Installation segments come from the options JSON so the markup stays
     identical between the inline section and the pop-up. */
  renderInstallOptions() {
    const group = this.querySelector('[data-install-group]');
    const fieldset = this.querySelector('[data-install-fieldset]');
    if (!group) return;

    const ids = Object.keys(this.options);
    if (fieldset) fieldset.hidden = ids.length === 0;
    if (!ids.length) return;

    const name = `dr-install-${this.dataset.uid || Math.random().toString(36).slice(2)}`;
    group.innerHTML = '';

    ids.forEach((id, index) => {
      const option = this.options[id];
      const label = document.createElement('label');
      label.className = 'dr-calc__segment';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = name;
      input.value = id;
      input.setAttribute('data-install', '');
      if (index === 0) input.checked = true;

      const span = document.createElement('span');
      span.textContent = option.label;

      label.append(input, span);
      group.appendChild(label);
    });
  }

  addWall() {
    const rows = this.wallsEl.querySelectorAll('[data-wall]');
    const clone = rows[0].cloneNode(true);
    clone.querySelectorAll('input').forEach((input) => {
      input.value = '';
    });
    this.wallsEl.appendChild(clone);
    this.syncRemoveButtons();
    const firstInput = clone.querySelector('input');
    if (firstInput) firstInput.focus();
    this.render();
  }

  removeWall(wall) {
    if (!wall) return;
    if (this.wallsEl.querySelectorAll('[data-wall]').length <= 1) return;
    wall.remove();
    this.syncRemoveButtons();
    this.render();
  }

  /* Only offer removal once more than one wall exists */
  syncRemoveButtons() {
    const rows = this.wallsEl.querySelectorAll('[data-wall]');
    rows.forEach((row) => {
      const btn = row.querySelector('[data-remove-wall]');
      if (btn) btn.hidden = rows.length <= 1;
    });
  }

  num(el, max) {
    if (!el) return 0;
    let value = parseFloat(el.value);
    if (!isFinite(value) || value < 0) value = 0;
    if (typeof max === 'number' && value > max) value = max;
    return value;
  }

  /* Total wall area in square feet */
  area() {
    let total = 0;
    this.wallsEl.querySelectorAll('[data-wall]').forEach((wall) => {
      const width =
        this.num(wall.querySelector('[data-width-ft]')) +
        this.num(wall.querySelector('[data-width-in]'), 11) / 12;
      const height =
        this.num(wall.querySelector('[data-height-ft]')) +
        this.num(wall.querySelector('[data-height-in]'), 11) / 12;
      total += width * height;
    });
    return total;
  }

  waste() {
    const checked = this.querySelector('[data-waste]:checked');
    return checked ? parseFloat(checked.value) || 0 : 0;
  }

  selectedOption() {
    const checked = this.querySelector('[data-install]:checked');
    return checked ? this.options[checked.value] : null;
  }

  formatArea(value) {
    const rounded = Math.round(value * 10) / 10;
    const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return `${text} sq. ft.`;
  }

  formatMoney(cents) {
    try {
      return new Intl.NumberFormat(document.documentElement.lang || 'en', {
        style: 'currency',
        currency: this.currency,
      }).format(cents / 100);
    } catch (error) {
      return `$${(cents / 100).toFixed(2)}`;
    }
  }

  render() {
    const area = this.area();
    const wastePct = this.waste();
    const option = this.selectedOption();

    const dash = '—';

    if (area <= 0) {
      this.out.totalArea.textContent = dash;
      this.out.boxes.textContent = dash;
      this.out.wasteNote.textContent = '';
      this.out.areaWithWaste.textContent = dash;
      this.out.coveragePurchased.textContent = dash;
      this.out.cost.textContent = dash;
      this.setSubmit(false, option);
      return;
    }

    const areaWithWaste = area * (1 + wastePct / 100);
    const perBox = (option && option.coverage) || this.coveragePerBox;
    const boxes = Math.max(1, Math.ceil(areaWithWaste / perBox));
    const coveragePurchased = boxes * perBox;

    const quantity = this.pricingUnit === 'per_sqft' ? Math.ceil(coveragePurchased) : boxes;
    const cost = option ? option.price * quantity : 0;

    this.out.totalArea.textContent = this.formatArea(area);
    this.out.boxes.textContent = boxes === 1 ? '1 box' : `${boxes} boxes`;
    this.out.wasteNote.textContent = `Includes ${wastePct}% waste allowance (${this.formatArea(
      areaWithWaste - area
    )})`;
    this.out.areaWithWaste.textContent = this.formatArea(areaWithWaste);
    this.out.coveragePurchased.textContent = this.formatArea(coveragePurchased);
    this.out.cost.textContent = option && option.price ? this.formatMoney(cost) : dash;

    if (this.quantityInput) this.quantityInput.value = quantity;
    if (this.variantInput && option) this.variantInput.value = option.variantId;

    this.setSubmit(true, option);
  }

  setSubmit(hasArea, option) {
    const purchasable = Boolean(hasArea && option && option.variantId && option.available);
    if (this.submitBtn) this.submitBtn.disabled = !purchasable;
    if (this.unavailableEl) {
      this.unavailableEl.hidden = !(hasArea && option && !purchasable);
    }
  }
}

if (!customElements.get('dr-coverage-calculator')) {
  customElements.define('dr-coverage-calculator', DRCoverageCalculator);
}

/* --------------------------------------------------------------------------
   Pop-up wiring.

   Every call-to-action links to #calculator, so the ordering calculator opens
   as a dialog instead of navigating. Without JS the link is an in-page anchor,
   which is harmless.
   -------------------------------------------------------------------------- */
(function () {
  const MODAL_ID = 'dr-calculator-modal';
  const opensCalculator = (el) =>
    el.closest('[data-dr-calc-open]') ||
    el.closest('a[href="#calculator"], a[href$="/#calculator"]');

  const getModal = () => document.getElementById(MODAL_ID);

  /* The dialog can close by Escape, by close(), or by a form method="dialog",
     and the `close` event is not reliably delivered everywhere. Watching the
     open attribute catches every one of those paths. */
  function watch(modal) {
    if (modal.__drWatched) return;
    modal.__drWatched = true;
    const sync = () => {
      const isOpen = modal.hasAttribute('open');
      document.body.classList.toggle('dr-modal-open', isOpen);
      if (!isOpen && modal.__trigger && typeof modal.__trigger.focus === 'function') {
        modal.__trigger.focus();
        modal.__trigger = null;
      }
    };
    new MutationObserver(sync).observe(modal, {
      attributes: true,
      attributeFilter: ['open'],
    });
    sync();
  }

  function open(trigger) {
    const modal = getModal();
    if (!modal || typeof modal.showModal !== 'function') return false;
    watch(modal);
    if (!modal.open) {
      modal.__trigger = trigger || null;
      modal.showModal();
      document.body.classList.add('dr-modal-open');
      const firstInput = modal.querySelector('input[type="number"]');
      if (firstInput) firstInput.focus();
    }
    return true;
  }

  function close() {
    const modal = getModal();
    if (!modal || !modal.open) return;
    modal.close();
    document.body.classList.remove('dr-modal-open');
  }

  document.addEventListener('click', (event) => {
    const trigger = opensCalculator(event.target);
    if (trigger) {
      if (open(trigger)) event.preventDefault();
      return;
    }
    if (event.target.closest('[data-dr-calc-close]')) {
      event.preventDefault();
      close();
    }
  });

  /* Click on the backdrop (outside the panel) dismisses */
  document.addEventListener('mousedown', (event) => {
    const modal = getModal();
    if (!modal || !modal.open || event.target !== modal) return;
    close();
  });

  function init() {
    const modal = getModal();
    if (modal) watch(modal);
    /* Deep link: /any-page#calculator opens it on load */
    if (window.location.hash === '#calculator') open(null);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
