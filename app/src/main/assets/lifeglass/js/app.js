(() => {
  const store = new LifeStore();
  const analytics = new AnalyticsModel(store);
  const insights = new InsightEngine(store, analytics);
  const view = new LifeView(store, analytics, insights);
  const controller = new LifeController(store, analytics, insights, view);
  controller.init();
})();
