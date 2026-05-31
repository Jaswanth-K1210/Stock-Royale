import yahooFinance from 'yahoo-finance2';

async function test() {
  try {
    const hist = await yahooFinance.historical('AAPL', { period1: '2024-05-01' });
    console.log('Historical points:', hist.length);
    console.log('First point:', hist[0]);
    
    const search = await yahooFinance.search('AAPL', { newsCount: 3 });
    console.log('News items:', search.news.length);
    console.log('First news:', search.news[0]);
  } catch(e) {
    console.error(e);
  }
}
test();
