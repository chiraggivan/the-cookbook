let modal;
let modalTitle;
let messageEl;
let okBtn;
let cancelBtn;
let xBtn;

// Alert dialog
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

// Messaging
export function showMessage(message) {
  const modalEl = document.getElementById("global-modal");
  modal = new bootstrap.Modal(modalEl);

  modalTitle.textContent = "Message";
  messageEl.textContent = message;

  cancelBtn.classList.add("d-none");
  okBtn.classList.add("d-none");

  modal.show();
}

// Confirm dialog
export function showConfirm(message, buttonName = null) {
  return new Promise((resolve) => {
    // reduce the message to 150 characters
    if (message.length > 150) {
      message = message.slice(0, 150) + "... ?";
    }

    messageEl.textContent = message;
    if (buttonName) {
      okBtn.textContent = buttonName;
    }

    modal.show();

    function cleanup() {
      okBtn.removeEventListener("click", onConfirm);
      [cancelBtn, xBtn].forEach((btn) =>
        btn.removeEventListener("click", onCancel),
      );
    }

    const onConfirm = () => {
      cleanup();
      modal.hide();
      resolve(true);
    };

    const onCancel = () => {
      cleanup();
      modal.hide();
      resolve(false);
    };

    okBtn.addEventListener("click", onConfirm);
    [cancelBtn, xBtn].forEach((btn) => btn.addEventListener("click", onCancel));
  });
}

// DOMContentLoaded logic
document.addEventListener("DOMContentLoaded", () => {
  const modalEl = document.getElementById("global-modal");
  if (!modalEl) return;

  modalTitle = document.getElementById("global-modal-title");
  messageEl = document.getElementById("global-modal-message");
  okBtn = document.getElementById("global-modal-ok");
  cancelBtn = document.getElementById("global-modal-cancel");
  xBtn = document.getElementById("modal-close-btn");

  modal = new bootstrap.Modal(modalEl);
});
