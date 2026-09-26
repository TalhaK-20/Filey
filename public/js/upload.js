document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('upload-form');
  const fileInput = document.getElementById('file-input');
  const dropzone = document.getElementById('dropzone');
  const dropzoneLabel = document.getElementById('dropzone-label');
  const progressWrap = document.getElementById('upload-progress');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const progressDetail = document.getElementById('progress-detail');
  const resultBox = document.getElementById('upload-result');
  const submitBtn = document.getElementById('upload-submit');
  const maxBytes = parseInt(dropzone.dataset.maxBytes, 10) || Infinity;

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) {
      dropzoneLabel.textContent = fileInput.files[0].name;
    }
  });

  ['dragover', 'dragenter'].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    })
  );
  ['dragleave', 'drop'].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    })
  );
  dropzone.addEventListener('drop', (e) => {
    const dropped = e.dataTransfer.files;
    if (dropped && dropped.length) {
      fileInput.files = dropped;
      dropzoneLabel.textContent = dropped[0].name;
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!fileInput.files[0]) {
      window.showToast('Please choose a file first.', 'error');
      return;
    }

    // Checked client-side before the network request even starts, so an oversized
    // file never has to hit the server (or the hosting platform's own request-size
    // limit) just to be told no — same failure, far less waiting and no ugly
    // network-level error.
    if (fileInput.files[0].size > maxBytes) {
      window.showToast(
        `That one's too big to share — max is ${window.formatBytes(maxBytes)}.`,
        'error'
      );
      return;
    }

    const formData = new FormData(form);
    const totalBytes = fileInput.files[0].size;
    const startTime = Date.now();

    progressWrap.classList.remove('hidden');
    progressFill.classList.remove('is-done');
    resultBox.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.classList.add('is-loading');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/upload');
    xhr.setRequestHeader('X-CSRF-Token', form._csrf.value);

    xhr.upload.addEventListener('progress', (e) => {
      if (!e.lengthComputable) return;
      const percent = Math.round((e.loaded / e.total) * 100);
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      const speed = elapsedSeconds > 0 ? e.loaded / elapsedSeconds : 0;

      progressFill.style.width = `${percent}%`;
      progressText.textContent = `${percent}%`;
      progressDetail.textContent = `${window.formatBytes(e.loaded)} / ${window.formatBytes(e.total)} — ${window.formatBytes(speed)}/s`;
    });

    xhr.onload = () => {
      submitBtn.disabled = false;
      submitBtn.classList.remove('is-loading');
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (err) {
        data = { success: false, error: { message: 'Unexpected server response.' } };
      }

      resultBox.classList.remove('hidden');
      if (xhr.status >= 200 && xhr.status < 300 && data.success) {
        progressFill.style.width = '100%';
        progressFill.classList.add('is-done');
        progressText.textContent = '100%';
        resultBox.innerHTML = `<p class="form-success">It's live: <a href="${data.data.url}">${data.data.originalName}</a></p>`;
        window.showToast('Your file is live.', 'success');
        form.reset();
        dropzoneLabel.textContent = 'Choose a file or drag it here';
      } else {
        resultBox.innerHTML = `<p class="form-error">${data.error ? data.error.message : "Couldn't share that file."}</p>`;
        window.showToast(data.error ? data.error.message : "Couldn't share that file.", 'error');
      }
    };

    xhr.onerror = () => {
      submitBtn.disabled = false;
      submitBtn.classList.remove('is-loading');
      resultBox.classList.remove('hidden');
      resultBox.innerHTML = '<p class="form-error">Lost the connection before it went out. Try again.</p>';
      window.showToast('Lost the connection before it went out. Try again.', 'error');
    };

    xhr.send(formData);
  });
});
