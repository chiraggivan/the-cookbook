let modal;
let modalTitle;
let messageEl;
let optionABtn;
let optionBBtn;
let cancelBtn;
let xBtn;

// Confirm dialog
export function showMultiConfirm(message, buttonA = null, buttonB = null) {
  return new Promise((resolve) => {
    messageEl.innerHTML = message;
    if (buttonA) {
      optionABtn.textContent = buttonA;
    }

    if (buttonB) {
      optionBBtn.textContent = buttonB;
    }

    modal.show();

    function cleanup() {
      optionABtn.removeEventListener("click", onOptonAConfirm);
      optionBBtn.removeEventListener("click", onOptonBConfirm);
      [cancelBtn, xBtn].forEach((btn) =>
        btn.removeEventListener("click", onCancel),
      );
    }

    const onOptonAConfirm = () => {
      cleanup();
      modal.hide();
      resolve("with-ingredients");
    };

    const onOptonBConfirm = () => {
      cleanup();
      modal.hide();
      resolve("component");
    };

    const onCancel = () => {
      // console.log("inside onCancel");
      cleanup();
      modal.hide();
      resolve(false);
    };

    optionABtn.addEventListener("click", onOptonAConfirm);
    optionBBtn.addEventListener("click", onOptonBConfirm);
    [cancelBtn, xBtn].forEach((btn) => btn.addEventListener("click", onCancel));
  });
}

// DOMContentLoaded logic
document.addEventListener("DOMContentLoaded", () => {
  const modalEl = document.getElementById("delete-component-modal");
  if (!modalEl) return;

  modalTitle = document.getElementById("delete-component-modal-title");
  messageEl = document.getElementById("delete-component-modal-message");
  cancelBtn = document.getElementById("delete-component-modal-cancel");
  xBtn = document.getElementById("delete-component-modal-x-btn");
  optionABtn = document.getElementById("delete-component-modal-option-a");
  optionBBtn = document.getElementById("delete-component-modal-option-b");

  modal = new bootstrap.Modal(modalEl);
});
