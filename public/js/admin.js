document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector('.admin-page');
  if (!page) return;
  const csrfToken = page.dataset.csrf;

  const modal = document.getElementById('delete-all-modal');
  const openBtn = document.getElementById('open-delete-all');
  const cancelBtn = document.getElementById('cancel-delete-all');
  const confirmBtn = document.getElementById('confirm-delete-all');

  if (modal && openBtn) {
    openBtn.addEventListener('click', () => modal.showModal());
    cancelBtn.addEventListener('click', () => modal.close());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.close();
    });

    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.classList.add('is-loading');
      try {
        const res = await fetch('/admin/files/delete-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        });
        const data = await res.json();
        if (data.success) {
          window.showToast(`Deleted ${data.data.count} file(s).`, 'success');
          modal.close();
          setTimeout(() => window.location.reload(), 600);
        } else {
          window.showToast(data.error.message, 'error');
          confirmBtn.disabled = false;
          confirmBtn.classList.remove('is-loading');
        }
      } catch (err) {
        window.showToast('Failed to delete all files.', 'error');
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('is-loading');
      }
    });
  }

  document.querySelectorAll('.js-admin-action').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const routes = {
        'block-file': `/admin/files/${id}/block`,
        'remove-file': `/admin/files/${id}/remove`,
        'restore-file': `/admin/files/${id}/restore`,
        'dismiss-report': `/admin/reports/${id}/resolve`,
      };
      const body = action === 'dismiss-report' ? { status: 'dismissed' } : {};
      btn.disabled = true;
      btn.classList.add('is-loading');
      try {
        const res = await fetch(routes[action], {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.success) {
          window.showToast('Done', 'success');
          setTimeout(() => window.location.reload(), 600);
        } else {
          window.showToast(data.error.message, 'error');
          btn.disabled = false;
          btn.classList.remove('is-loading');
        }
      } catch (err) {
        window.showToast('Action failed.', 'error');
        btn.disabled = false;
        btn.classList.remove('is-loading');
      }
    });
  });
});
