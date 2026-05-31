import yahooFinance from "yahoo-finance2";

async function test() {
  try {
    const result = await yahooFinance.historical("AAPL", { period1: "2024-05-01" });
    console.log("Historical works, length:", result.length);
  } catch(e) {
    console.error("Historical error:", e.message);
  }
  
  try {
    const chart = await yahooFinance.chart("AAPL", { period1: "2024-05-01" });
    console.log("Chart works, length:", chart.quotes.length);
  } catch(e) {
    console.error("Chart error:", e.message);
  }
}
test();
