const axios = require('axios');
const cheerio = require('cheerio');

async function testExactUrl() {
  try {
    console.log('실시간 베스트 갤러리 정확한 URL 찾기...');
    
    // 웹 검색 결과에서 확인한 정확한 URL
    const url = 'https://gall.dcinside.com/board/lists?id=dcbest';
    console.log(`URL: ${url}`);
    
    const res = await axios.get(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3'
      } 
    });
    
    console.log(`응답 상태: ${res.status}`);
    console.log(`응답 크기: ${res.data.length} bytes`);
    
    const $ = cheerio.load(res.data);
    
    console.log('\n=== 모든 게시글 분석 ===');
    const allRows = $('tr.ub-content');
    console.log(`총 ${allRows.length}개의 tr.ub-content 발견`);
    
    allRows.each((i, el) => {
      const $el = $(el);
      const id = $el.attr('data-no');
      const titleEl = $el.find('td.gall_tit a');
      const title = titleEl.text().trim();
      const writer = $el.find('td.gall_writer span.nickname em').text().trim();
      
      console.log(`\n[${i+1}] ID: ${id}`);
      console.log(`    제목: "${title}"`);
      console.log(`    작성자: ${writer}`);
      console.log(`    클래스: ${$el.attr('class')}`);
      
      // 한화 + 김나연 + 수영복 검색
      if (title.includes('한화') && title.includes('김나연') && title.includes('수영복')) {
        console.log(`🎯🎯🎯 목표 게시글 발견! 🎯🎯🎯`);
        console.log(`    ID: ${id}`);
        console.log(`    제목: "${title}"`);
        console.log(`    작성자: ${writer}`);
      }
    });
    
  } catch (error) {
    console.error('테스트 실패:', error.message);
  }
}

testExactUrl();
