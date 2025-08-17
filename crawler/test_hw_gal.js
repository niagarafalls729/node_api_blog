const axios = require('axios');
const cheerio = require('cheerio');

async function testHwGallery() {
  try {
    console.log('한화 갤러리에서 김나연 관련 게시글 검색...');
    
    // 한화 갤러리 URL
    const url = 'https://gall.dcinside.com/board/lists?id=hw&page=1';
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
    
    console.log('\n=== 한화 갤러리 최신 게시글 30개 확인 ===');
    $('tr.ub-content').slice(0, 30).each((i, el) => {
      const $el = $(el);
      
      // 공지글 제외
      if ($el.hasClass('icon_notice')) {
        return;
      }
      
      const id = $el.attr('data-no');
      const titleEl = $el.find('td.gall_tit a');
      const title = titleEl.text().trim();
      const writer = $el.find('td.gall_writer span.nickname em').text().trim();
      const dateStr = $el.find('td.gall_date').attr('title') || $el.find('td.gall_date').text().trim();
      
      // 이미지 게시글 여부 확인
      const hasThumbnail = $el.hasClass('thum') || $el.find('.thumimg img').length > 0;
      const isImageOnly = hasThumbnail && (title.includes('[ㅇㅎ]') || title.includes('[이미지]') || title.length < 10);
      
      console.log(`[${i+1}] ID: ${id}`);
      console.log(`    제목: ${title}`);
      console.log(`    작성자: ${writer}`);
      console.log(`    날짜: ${dateStr}`);
      console.log(`    썸네일: ${hasThumbnail}, 이미지전용: ${isImageOnly}`);
      console.log('');
    });
    
    // 김나연 관련 게시글 검색
    console.log('=== 김나연 관련 게시글 검색 ===');
    let found = false;
    $('tr.ub-content').each((i, el) => {
      const $el = $(el);
      const title = $el.find('td.gall_tit a').text().trim();
      
      if (title.includes('김나연')) {
        const id = $el.attr('data-no');
        const writer = $el.find('td.gall_writer span.nickname em').text().trim();
        console.log(`🎯 김나연 관련 발견! ID: ${id}, 제목: ${title}, 작성자: ${writer}`);
        found = true;
      }
    });
    
    if (!found) {
      console.log('❌ 김나연 관련 게시글을 찾을 수 없습니다.');
    }
    
    // 수영복 관련 게시글 검색
    console.log('\n=== 수영복 관련 게시글 검색 ===');
    $('tr.ub-content').each((i, el) => {
      const $el = $(el);
      const title = $el.find('td.gall_tit a').text().trim();
      
      if (title.includes('수영복')) {
        const id = $el.attr('data-no');
        const writer = $el.find('td.gall_writer span.nickname em').text().trim();
        console.log(`수영복 관련: ID: ${id}, 제목: ${title}, 작성자: ${writer}`);
      }
    });
    
  } catch (error) {
    console.error('테스트 실패:', error.message);
  }
}

testHwGallery();
