// Shared Share/Delete icon-button behavior for any page listing files (homepage,
// file details, profile). Download needs no JS — it's a plain link to the download
// route.
document.addEventListener('DOMContentLoaded', () => {
  const csrfToken = document.body.dataset.csrf;

  document.querySelectorAll('.js-share-file').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const url = `${window.location.origin}/files/${id}`;
      try {
        await navigator.clipboard.writeText(url);
        window.showToast('Link copied to clipboard.', 'success');
      } catch (err) {
        window.showToast('Could not copy the link.', 'error');
      }
    });
  });

  document.querySelectorAll('.js-delete-file').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Delete this file? This cannot be undone.')) return;

      const id = btn.dataset.id;
      btn.disabled = true;
      btn.classList.add('is-loading');
      try {
        const res = await fetch(`/files/${id}/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        });
        const data = await res.json();
        if (data.success) {
          window.showToast('File deleted.', 'success');
          setTimeout(() => window.location.reload(), 500);
        } else {
          window.showToast(data.error.message, 'error');
          btn.disabled = false;
          btn.classList.remove('is-loading');
        }
      } catch (err) {
        window.showToast('Failed to delete file.', 'error');
        btn.disabled = false;
        btn.classList.remove('is-loading');
      }
    });
  });
});
