document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('report-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.classList.add('is-loading');

    const fileId = form.dataset.fileId;
    const body = {
      reason: form.reason.value,
      description: form.description.value,
    };
    try {
      const res = await fetch(`/files/${fileId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': form._csrf.value },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        window.showToast(data.data.message, 'success');
        form.reset();
      } else {
        window.showToast(data.error.message, 'error');
      }
    } catch (err) {
      window.showToast('Failed to submit report.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('is-loading');
    }
  });
});
