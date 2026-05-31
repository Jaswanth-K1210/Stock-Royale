import yahooFinance from 'yahoo-finance2';
async function test() {
  try {
    const methods = Object.keys(yahooFinance);
    console.log("Exported keys:", methods);
    console.log("Has chart?", typeof yahooFinance.chart);
    console.log("Has historical?", typeof yahooFinance.historical);
    console.log("Has search?", typeof yahooFinance.search);
  } catch(e) {
    console.error(e);
  }
}
test();
