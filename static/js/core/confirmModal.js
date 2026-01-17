let modal;
let messageEl;
let okBtn;
let cancelBtn;

document.addEventListener("DOMContentLoaded", () => {
  const modalEl = document.getElementById("global-modal");

  if (!modalEl) return;

  modal = new bootstrap.Modal(modalEl);
  messageEl = document.getElementById("global-modal-message");
  okBtn = document.getElementById("global-modal-ok");
  cancelBtn = document.getElementById("global-modal-cancel");
});

/**
 * Confirm dialog
 */
export function showConfirm(message) {
  return new Promise((resolve) => {
    messageEl.textContent = message;

    // cancelBtn.classList.remove("d-none");
    okBtn.textContent = "Delete";
    okBtn.className = "btn btn-danger";

    modal.show();

    const onConfirm = () => {
      cleanup();
      modal.hide();
      resolve(true);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    function cleanup() {
      okBtn.removeEventListener("click", onConfirm);
      cancelBtn.removeEventListener("click", onCancel);
    }

    okBtn.addEventListener("click", onConfirm);
    cancelBtn.addEventListener("click", onCancel);
  });
}

/**
 * Alert dialog
 */
export function showAlert(message, isError = false) {
  messageEl.textContent = message;

  cancelBtn.classList.add("d-none");
  okBtn.textContent = "OK";
  okBtn.className = isError ? "btn btn-danger" : "btn btn-success";

  modal.show();

  const onOk = () => {
    modal.hide();
    okBtn.removeEventListener("click", onOk);
    cancelBtn.classList.remove("d-none");
  };

  okBtn.addEventListener("click", onOk);
}
