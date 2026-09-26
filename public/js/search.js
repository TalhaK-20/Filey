// Auto-submits the filter form when a select changes, so sorting/filtering
// feels instant without needing a separate "apply" button.
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.filter-form');
  if (!form) return;

  form.querySelectorAll('select').forEach((select) => {
    // requestSubmit() (rather than submit()) fires a real 'submit' event, so the
    // shared loading-state handler in main.js still kicks in on auto-submit.
    select.addEventListener('change', () => form.requestSubmit());
  });
});
