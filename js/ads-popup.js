// Ad Popup Logic
document.addEventListener('DOMContentLoaded', () => {
    // Determine operator ID from filename or meta tag (or just pass it in)
    // We can infer from the page logic which operator we are
    // For now, let's look for a global var `currentOperatorId` or just check URL

    // Safety check: Don't show if already closed in this session? 
    // User requested: "after 3 seconds ... wrong mark to take of"

    setTimeout(() => {
        showAd();
    }, 3000);
});

function showAd() {
    const modal = document.getElementById('adModal');
    if (modal) {
        modal.classList.add('active');

        const closeBtn = document.getElementById('adCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
    }
}
