document.addEventListener('DOMContentLoaded', async () => {
  const tabSummary = document.getElementById('tabSummary');
  const tabDashboard = document.getElementById('tabDashboard');
  const summaryView = document.getElementById('summaryView');
  const dashboardView = document.getElementById('dashboardView');

  if (!tabSummary || !tabDashboard || !summaryView || !dashboardView) return;

  function showSummary() {
    tabSummary.classList.add('active');
    tabDashboard.classList.remove('active');
    summaryView.style.display = 'flex';
    dashboardView.style.display = 'none';
  }

  function showDashboard() {
    tabSummary.classList.remove('active');
    tabDashboard.classList.add('active');
    summaryView.style.display = 'none';
    dashboardView.style.display = 'flex';
  }

  tabSummary.addEventListener('click', async () => {
    showSummary();
    await chrome.storage.local.set({ onepaceView: 'summary' });
  });

  tabDashboard.addEventListener('click', async () => {
    showDashboard();
    await chrome.storage.local.set({ onepaceView: 'dashboard' });
  });

  const { onepaceView = 'summary' } = await chrome.storage.local.get('onepaceView');
  onepaceView === 'dashboard' ? showDashboard() : showSummary();
});
