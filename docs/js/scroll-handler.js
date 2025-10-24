// Show/hide sticky page name on scroll
window.addEventListener('scroll', function() {
    const stickyPageName = document.getElementById('stickyPageName');
    if (window.scrollY > 300) {
        stickyPageName.classList.add('visible');
    } else {
        stickyPageName.classList.remove('visible');
    }
});
