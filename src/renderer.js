/* renderer.js — buildPages shell + confirm modal */

function buildPages() {
  const main = document.getElementById('mainContent');
  const modals = document.getElementById('modalContainer');

  // Create page sections
  NAV_ITEMS.forEach(id => {
    const sec = document.createElement('div');
    sec.className = 'page-section';
    sec.id = `page-${id}`;
    main.appendChild(sec);
  });

  // Confirm modal
  if (!document.getElementById('confirmModal')) {
    modals.innerHTML = renderModal('confirmModal', 'Confirm', `<p id="confirmMsg"></p>`,
      `<button class="btn btn-outline" onclick="closeModal('confirmModal')">${t('cancel')}</button>
       <button class="btn btn-danger" id="confirmYes">${t('delete')}</button>`, 'confirm-dialog sm');

    document.getElementById('confirmYes').addEventListener('click', () => {
      closeModal('confirmModal');
      if (_confirmCb) { _confirmCb(); _confirmCb = null; }
    });
  }
}
